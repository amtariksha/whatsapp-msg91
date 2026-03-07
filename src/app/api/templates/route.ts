import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestContext } from "@/lib/request";
import { getAppSetting } from "@/lib/settings";

/**
 * GET /api/templates
 * Fetch WhatsApp templates from MSG91 using the documented endpoint:
 * control.msg91.com/api/v5/whatsapp/get-template-client/:number
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

        // Get the org's integrated number (required by this MSG91 endpoint)
        const { data: numRow } = await supabaseAdmin
            .from("integrated_numbers")
            .select("number")
            .eq("org_id", orgId)
            .eq("active", true)
            .limit(1)
            .maybeSingle();

        const integratedNumber = numRow?.number || "";

        if (!integratedNumber) {
            return NextResponse.json(
                { error: "No integrated WhatsApp number configured. Add one in Settings → WhatsApp Numbers." },
                { status: 400 }
            );
        }

        const url = `https://control.msg91.com/api/v5/whatsapp/get-template-client/${integratedNumber}`;

        const response = await fetch(url, {
            headers: {
                authkey: authKey,
                accept: "application/json",
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
