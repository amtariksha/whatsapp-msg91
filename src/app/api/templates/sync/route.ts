import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestContext } from "@/lib/request";
import { getAppSetting } from "@/lib/settings";

// ─── POST /api/templates/sync ───────────────────────────────
// Sync templates with MSG91 / Meta — fetches remote templates and
// updates local template statuses (pending → approved/rejected).
export async function POST(request: NextRequest) {
    const { orgId } = getRequestContext(request.headers);

    // Resolve auth key: app_settings → organizations table → env var
    let authKey = await getAppSetting("msg91_auth_key", "", orgId);
    if (!authKey) {
        const { data: orgRow } = await supabaseAdmin
            .from("organizations")
            .select("msg91_auth_key")
            .eq("id", orgId)
            .maybeSingle();
        authKey = orgRow?.msg91_auth_key || process.env.MSG91_AUTH_KEY || "";
    }
    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91 Auth Key not configured. Set it in Settings or as MSG91_AUTH_KEY env variable." },
            { status: 500 }
        );
    }

    try {
        // Get the org's integrated number — prefer msg91 provider for this endpoint
        const { data: numRows } = await supabaseAdmin
            .from("integrated_numbers")
            .select("number, provider")
            .eq("org_id", orgId)
            .eq("active", true)
            .order("created_at", { ascending: true })
            .limit(10);

        const msg91Num = (numRows || []).find((n: any) => !n.provider || n.provider === "msg91");
        const anyNum = (numRows || [])[0];
        const integratedNumber = msg91Num?.number || anyNum?.number || "";

        if (!integratedNumber) {
            return NextResponse.json(
                { error: "No integrated WhatsApp number configured. Add one in Settings → WhatsApp Numbers." },
                { status: 400 }
            );
        }

        console.log(`[Template Sync] Fetching from MSG91 for number: ${integratedNumber}, orgId: ${orgId}`);

        // Fetch templates from MSG91
        const url = `https://control.msg91.com/api/v5/whatsapp/get-template-client/${integratedNumber}`;
        const response = await fetch(url, {
            headers: {
                authkey: authKey,
                accept: "application/json",
            },
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("[Template Sync] MSG91 error:", response.status, errText);
            return NextResponse.json(
                { error: `Failed to fetch templates from MSG91 (${response.status}): ${errText}` },
                { status: 502 }
            );
        }

        const data = await response.json();
        const templates = Array.isArray(data) ? data : data?.data || data?.templates || [];

        // Log raw first template to see all available fields from MSG91
        if (templates.length > 0) {
            console.log(`[Template Sync] Raw MSG91 template sample (first):`, JSON.stringify(templates[0], null, 2));
        }

        const remoteTemplates = templates.map((t: Record<string, unknown>) => {
            // MSG91 may return status under different field names
            const rawStatus = (
                t.status || t.approval_status || t.template_status ||
                t.quality_rating || t.state || ""
            ) as string;

            // MSG91 may return id under different field names
            const rawId = (
                t.id || t.template_id || t._id || t.templateId || ""
            ) as string;

            // MSG91 may return name under different field names
            const rawName = (
                t.name || t.template_name || t.templateName || ""
            ) as string;

            return {
                id: rawId,
                name: rawName,
                status: rawStatus.toLowerCase(),
                category: t.category || t.template_category || "",
                language: t.language || t.lang || "en",
            };
        });

        console.log(`[Template Sync] Fetched ${remoteTemplates.length} remote templates from MSG91`);
        for (const rt of remoteTemplates) {
            console.log(`[Template Sync]   Remote: "${rt.name}" status="${rt.status}" category="${rt.category}" id="${rt.id}"`);
        }

        // Update local templates_local statuses AND categories from MSG91 remote
        // Match by msg91_template_id first, then by name (case-insensitive)
        const { data: localTemplates } = await supabaseAdmin
            .from("templates_local")
            .select("id, name, status, category, msg91_template_id")
            .eq("org_id", orgId);

        console.log(`[Template Sync] Found ${(localTemplates || []).length} local templates for org ${orgId}`);

        let updated = 0;
        const unmatched: string[] = [];

        for (const local of localTemplates || []) {
            // Match by msg91_template_id first, then by name (case-insensitive)
            const remote = remoteTemplates.find(
                (r) =>
                    (local.msg91_template_id && r.id && r.id === local.msg91_template_id) ||
                    r.name === local.name ||
                    (r.name && local.name && r.name.toLowerCase() === local.name.toLowerCase())
            );

            if (!remote) {
                unmatched.push(local.name);
                continue;
            }

            // Check if status or category changed
            const remoteCategory = ((remote.category as string) || "").toUpperCase();
            const localCategory = ((local.category as string) || "").toUpperCase();
            const remoteStatus = remote.status?.toLowerCase() || "";
            const localStatus = local.status?.toLowerCase() || "";

            // Only update status if remote has a real value (don't overwrite with empty)
            const statusChanged = remoteStatus && remoteStatus !== localStatus;
            const categoryChanged = remoteCategory && remoteCategory !== localCategory;

            if (statusChanged || categoryChanged) {
                const updateData: Record<string, unknown> = {
                    updated_at: new Date().toISOString(),
                };
                // Always link msg91_template_id if we have one
                if (remote.id) updateData.msg91_template_id = remote.id;
                if (statusChanged) updateData.status = remoteStatus;
                if (categoryChanged) updateData.category = remoteCategory;

                const { error: updateErr } = await supabaseAdmin
                    .from("templates_local")
                    .update(updateData)
                    .eq("id", local.id);

                if (!updateErr) {
                    updated++;
                    if (statusChanged) console.log(`[Template Sync] ✓ ${local.name}: status "${localStatus}" → "${remoteStatus}"`);
                    if (categoryChanged) console.log(`[Template Sync] ✓ ${local.name}: category "${localCategory}" → "${remoteCategory}"`);
                } else {
                    console.warn("[Template Sync] Update error for", local.name, updateErr.message);
                }
            } else {
                console.log(`[Template Sync] ─ ${local.name}: no changes (remote_status="${remoteStatus}", local_status="${localStatus}", remote_cat="${remoteCategory}", local_cat="${localCategory}")`);
            }
        }

        if (unmatched.length > 0) {
            console.log(`[Template Sync] ✗ ${unmatched.length} local templates had no remote match: ${unmatched.join(", ")}`);
            console.log(`[Template Sync] Remote template names: ${remoteTemplates.map((r) => r.name).join(", ")}`);
        }

        console.log(`[Template Sync] Done. Updated ${updated} of ${(localTemplates || []).length} local templates.`);

        return NextResponse.json({
            synced: true,
            count: remoteTemplates.length,
            updated,
            templates: remoteTemplates,
        });
    } catch (err) {
        console.error("Template sync error:", err);
        return NextResponse.json(
            { error: "Template sync failed" },
            { status: 500 }
        );
    }
}
