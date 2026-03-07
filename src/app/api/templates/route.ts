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

        // Get the org's integrated number — prefer msg91 provider numbers for this endpoint
        const { data: numRow } = await supabaseAdmin
            .from("integrated_numbers")
            .select("number, provider")
            .eq("org_id", orgId)
            .eq("active", true)
            .order("created_at", { ascending: true })
            .limit(10);

        // Prefer an MSG91-provider number; fall back to any number
        const msg91Num = (numRow || []).find((n: any) => !n.provider || n.provider === "msg91");
        const anyNum = (numRow || [])[0];
        const integratedNumber = msg91Num?.number || anyNum?.number || "";

        if (!integratedNumber) {
            return NextResponse.json(
                { error: "No integrated WhatsApp number configured. Add one in Settings → WhatsApp Numbers." },
                { status: 400 }
            );
        }

        console.log(`[GET Templates] Fetching for number: ${integratedNumber}, orgId: ${orgId}`);
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
            console.error(`[GET Templates] Number used: ${integratedNumber}, authKey ending: ...${authKey.slice(-6)}`);
            return NextResponse.json(
                { error: `Failed to fetch templates from MSG91 (${response.status}): ${JSON.stringify(data)}` },
                { status: 502 }
            );
        }

        // If MSG91 returns an array, return it directly; otherwise unwrap
        const rawTemplates = Array.isArray(data) ? data : data.data || data.templates || [];

        // Normalize fields: MSG91 may return status/category in uppercase
        const templates = rawTemplates.map((t: Record<string, unknown>) => ({
            ...t,
            status: ((t.status as string) || "").toLowerCase(),
            category: ((t.category as string) || "MARKETING").toUpperCase(),
        }));

        return NextResponse.json(templates);
    } catch (err) {
        console.error("[GET Templates] Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch templates" },
            { status: 500 }
        );
    }
}
