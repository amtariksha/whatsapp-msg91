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
                { error: `Failed to fetch templates from MSG91 (${response.status})` },
                { status: 502 }
            );
        }

        const data = await response.json();
        const templates = Array.isArray(data) ? data : data?.data || data?.templates || [];

        const remoteTemplates = templates.map((t: Record<string, unknown>) => ({
            id: t.id || t.template_id,
            name: t.name || t.template_name,
            status: ((t.status as string) || "").toLowerCase(),
            category: t.category,
            language: t.language || "en",
        }));

        // Update local templates_local statuses AND categories from MSG91 remote
        // Match by name (or msg91_template_id) and update status + category
        const { data: localTemplates } = await supabaseAdmin
            .from("templates_local")
            .select("id, name, status, category, msg91_template_id")
            .eq("org_id", orgId);

        let updated = 0;
        for (const local of localTemplates || []) {
            // Match by msg91_template_id first, then by name
            const remote = remoteTemplates.find(
                (r: { id: string; name: string }) =>
                    (local.msg91_template_id && r.id === local.msg91_template_id) ||
                    r.name === local.name
            );

            if (!remote) continue;

            // Check if status or category changed
            const remoteCategory = ((remote.category as string) || "").toUpperCase();
            const localCategory = ((local.category as string) || "").toUpperCase();
            const statusChanged = remote.status !== local.status;
            const categoryChanged = remoteCategory && remoteCategory !== localCategory;

            if (statusChanged || categoryChanged) {
                const updateData: Record<string, unknown> = {
                    msg91_template_id: remote.id || local.msg91_template_id,
                    updated_at: new Date().toISOString(),
                };
                if (statusChanged) updateData.status = remote.status;
                if (categoryChanged) updateData.category = remoteCategory;

                const { error: updateErr } = await supabaseAdmin
                    .from("templates_local")
                    .update(updateData)
                    .eq("id", local.id);

                if (!updateErr) {
                    updated++;
                    if (statusChanged) console.log(`[Template Sync] ${local.name}: status ${local.status} → ${remote.status}`);
                    if (categoryChanged) console.log(`[Template Sync] ${local.name}: category ${localCategory} → ${remoteCategory}`);
                } else {
                    console.warn("[Template Sync] Update error for", local.name, updateErr.message);
                }
            }
        }

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
