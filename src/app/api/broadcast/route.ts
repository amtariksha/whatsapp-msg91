import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestContext } from "@/lib/request";
import { getAppSetting } from "@/lib/settings";

const MSG91_API_BASE_URL = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

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

        // Build per-recipient messages for MSG91 bulk API
        const messages = (recipients as RecipientEntry[]).map((entry) => {
            const phone = typeof entry === "string" ? entry : entry.phone;
            // Per-recipient variables override the global static variables
            const recipientVars = typeof entry === "object" && entry.variables
                ? entry.variables
                : variables || {};

            const bodyValues = Object.keys(recipientVars).sort().map(key => recipientVars[key]);

            const components: any[] = [];
            if (bodyValues.length > 0) {
                components.push({
                    type: "body",
                    parameters: bodyValues.map(val => ({ type: "text", value: val }))
                });
            }

            return {
                to: [phone],
                components: components.length > 0 ? components : undefined
            };
        });

        const payload = {
            integrated_number: integratedNumber,
            template: {
                name: templateId,
                language: {
                    policy: "deterministic",
                    code: templateLanguage || "en"
                }
            },
            messages: messages
        };

        console.log(`[Broadcast API] Sending to ${messages.length} recipients via MSG91`);
        console.log("[Broadcast API] Payload sample (first 2):", JSON.stringify({
            ...payload,
            messages: messages.slice(0, 2)
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

        console.log(`[Broadcast API] Success. Sent to ${messages.length} recipients.`);
        return NextResponse.json({ success: true, data, count: messages.length });

    } catch (error: any) {
        console.error("[Broadcast API] Internal error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
