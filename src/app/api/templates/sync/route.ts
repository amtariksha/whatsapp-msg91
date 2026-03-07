import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestContext } from "@/lib/request";
import { getAppSetting } from "@/lib/settings";

// ─── POST /api/templates/sync ───────────────────────────────
// Sync templates with MSG91 / Meta — fetches remote templates and
// updates local template statuses (pending → approved/rejected).
export async function POST(request: NextRequest) {
    const { orgId } = getRequestContext(request.headers);
    const authKey = await getAppSetting("msg91_auth_key", process.env.MSG91_AUTH_KEY || "", orgId);
    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91 Auth Key not configured. Set it in Settings or as MSG91_AUTH_KEY env variable." },
            { status: 500 }
        );
    }

    try {
        // Fetch templates from MSG91
        const response = await fetch(
            "https://control.msg91.com/api/v5/whatsapp/getTemplates",
            {
                headers: {
                    authkey: authKey,
                },
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error("[Template Sync] MSG91 error:", response.status, errText);
            return NextResponse.json(
                { error: `Failed to fetch templates from MSG91 (${response.status})` },
                { status: 502 }
            );
        }

        const data = await response.json();
        const templates = data?.data || data?.templates || [];

        const remoteTemplates = templates.map((t: Record<string, unknown>) => ({
            id: t.id || t.template_id,
            name: t.name || t.template_name,
            status: ((t.status as string) || "").toLowerCase(),
            category: t.category,
            language: t.language || "en",
        }));

        // Update local templates_local statuses from MSG91 remote status
        // Match by name (or msg91_template_id) and update status
        const { data: localTemplates } = await supabaseAdmin
            .from("templates_local")
            .select("id, name, status, msg91_template_id")
            .eq("org_id", orgId);

        let updated = 0;
        for (const local of localTemplates || []) {
            // Match by msg91_template_id first, then by name
            const remote = remoteTemplates.find(
                (r: { id: string; name: string }) =>
                    (local.msg91_template_id && r.id === local.msg91_template_id) ||
                    r.name === local.name
            );

            if (remote && remote.status !== local.status) {
                const { error: updateErr } = await supabaseAdmin
                    .from("templates_local")
                    .update({
                        status: remote.status,
                        msg91_template_id: remote.id || local.msg91_template_id,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", local.id);

                if (!updateErr) updated++;
                else console.warn("[Template Sync] Update error for", local.name, updateErr.message);
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
