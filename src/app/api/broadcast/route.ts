import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestContext } from "@/lib/request";
import { getAppSetting } from "@/lib/settings";

// MSG91 template bulk API — uses same endpoint as working chat/send template route
const MSG91_API_BASE_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

// Recipient can be a plain phone string OR an object with per-recipient variables
type RecipientEntry = string | { phone: string; variables?: Record<string, string> };

export async function POST(request: NextRequest) {
    try {
        const { orgId } = getRequestContext(request.headers);
        const body = await request.json();
        const { templateId, templateLanguage, variables, recipients, integratedNumber } = body;

        if (!templateId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields (templateId, recipients) or recipients is empty" },
                { status: 400 }
            );
        }

        // Check app_settings first, then organizations table, then env var
        let MSG91_AUTH_KEY = await getAppSetting("msg91_auth_key", "", orgId);
        if (!MSG91_AUTH_KEY) {
            const { data: orgRow } = await supabaseAdmin
                .from("organizations")
                .select("msg91_auth_key")
                .eq("id", orgId)
                .maybeSingle();
            MSG91_AUTH_KEY = orgRow?.msg91_auth_key || process.env.MSG91_AUTH_KEY || "";
        }
        if (!MSG91_AUTH_KEY) {
            console.error("[Broadcast API] MSG91 Auth Key is missing");
            return NextResponse.json(
                { error: "MSG91 Auth Key not configured. Set it in Settings or as MSG91_AUTH_KEY env variable." },
                { status: 500 }
            );
        }

        // Resolve integrated number — fall back to org's first active number if not provided
        let sendFromNumber = integratedNumber;
        if (!sendFromNumber || sendFromNumber === "default") {
            const { data: fallbackNum } = await supabaseAdmin
                .from("integrated_numbers")
                .select("number")
                .eq("org_id", orgId)
                .eq("active", true)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (fallbackNum) {
                sendFromNumber = fallbackNum.number;
                console.log(`[Broadcast API] Resolved sending number to: ${sendFromNumber}`);
            }
        }

        if (!sendFromNumber) {
            return NextResponse.json(
                { error: "No integrated number configured. Add one in Settings → WhatsApp Numbers." },
                { status: 400 }
            );
        }

        // Build per-recipient to_and_components array for MSG91 bulk template API
        // MSG91 expects components as an object with named keys: body_1, body_2, header_1, etc.
        // Docs: { "body_1": { "type": "text", "value": "val" }, "body_2": { ... } }
        const toAndComponents = (recipients as RecipientEntry[]).map((entry) => {
            const phone = typeof entry === "string" ? entry : entry.phone;
            // Per-recipient variables override the global static variables
            const recipientVars = typeof entry === "object" && entry.variables
                ? entry.variables
                : variables || {};

            // Sort keys numerically: {{1}}, {{2}}, etc. → extract values in order
            const sortedKeys = Object.keys(recipientVars).sort();
            const components: Record<string, { type: string; value: string }> = {};

            sortedKeys.forEach((key, idx) => {
                // Map {{1}} → body_1, {{2}} → body_2, etc.
                components[`body_${idx + 1}`] = {
                    type: "text",
                    value: recipientVars[key],
                };
            });

            return {
                to: [phone],
                components,
            };
        });

        // MSG91 bulk template payload — must include content_type and nested payload structure
        const payload = {
            integrated_number: sendFromNumber,
            content_type: "template",
            payload: {
                messaging_product: "whatsapp",
                type: "template",
                template: {
                    name: templateId,
                    language: { code: templateLanguage || "en" },
                    to_and_components: toAndComponents,
                },
            },
        };

        console.log(`[Broadcast API] Sending to ${toAndComponents.length} recipients via MSG91`);
        console.log("[Broadcast API] Payload sample (first 2 recipients):", JSON.stringify({
            ...payload,
            payload: {
                ...payload.payload,
                template: {
                    ...payload.payload.template,
                    to_and_components: toAndComponents.slice(0, 2),
                },
            },
        }, null, 2));

        const response = await fetch(MSG91_API_BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                authkey: MSG91_AUTH_KEY,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || data.hasError) {
            console.error("[Broadcast API] MSG91 Error:", data);
            return NextResponse.json(
                { error: data.message || data.errors || "Failed to send bulk broadcast via MSG91" },
                { status: 400 }
            );
        }

        console.log(`[Broadcast API] Success. Sent to ${toAndComponents.length} recipients.`);
        return NextResponse.json({ success: true, data, count: toAndComponents.length });

    } catch (error: any) {
        console.error("[Broadcast API] Internal error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
