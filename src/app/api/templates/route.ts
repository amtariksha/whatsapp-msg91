import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { getAppSetting } from "@/lib/settings";

const MSG91_TEMPLATE_API =
    "https://control.msg91.com/api/v5/whatsapp/getTemplates";

/**
 * GET /api/templates
 * Proxy to MSG91 template listing API.
 * Returns the list of WhatsApp templates (approved ones for broadcast).
 */
export async function GET(request: NextRequest) {
    const { orgId } = getRequestContext(request.headers);
    try {
        const authKey = await getAppSetting("msg91_auth_key", process.env.MSG91_AUTH_KEY || "", orgId);

        if (!authKey) {
            return NextResponse.json(
                { error: "MSG91 Auth Key not configured. Set it in Settings or as MSG91_AUTH_KEY env variable." },
                { status: 500 }
            );
        }

        const response = await fetch(MSG91_TEMPLATE_API, {
            headers: {
                authkey: authKey,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[GET Templates] MSG91 error:", response.status, JSON.stringify(data));
            return NextResponse.json(
                { error: `Failed to fetch templates from MSG91 (${response.status})` },
                { status: 502 }
            );
        }

        // If MSG91 returns an array, return it directly; otherwise unwrap
        const templates = Array.isArray(data) ? data : data.data || data.templates || [];
        return NextResponse.json(templates);
    } catch (err) {
        console.error("[GET Templates] Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch templates" },
            { status: 500 }
        );
    }
}
