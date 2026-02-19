import { NextResponse } from "next/server";

// ─── POST /api/templates/sync ───────────────────────────────
// Sync templates with MSG91 / Meta
export async function POST() {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91_AUTH_KEY not configured" },
            { status: 500 }
        );
    }

    try {
        // Fetch templates from MSG91
        const response = await fetch(
            "https://api.msg91.com/api/v5/whatsapp/getTemplates",
            {
                headers: {
                    authkey: authKey,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch templates from MSG91" },
                { status: 502 }
            );
        }

        const data = await response.json();
        const templates = data?.data || data?.templates || [];

        return NextResponse.json({
            synced: true,
            count: templates.length,
            templates: templates.map((t: Record<string, unknown>) => ({
                id: t.id || t.template_id,
                name: t.name || t.template_name,
                status: t.status,
                category: t.category,
                language: t.language || "en",
            })),
        });
    } catch (err) {
        console.error("Template sync error:", err);
        return NextResponse.json(
            { error: "Template sync failed" },
            { status: 500 }
        );
    }
}
