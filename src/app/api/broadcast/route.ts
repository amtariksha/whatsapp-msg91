import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "";
const MSG91_API_BASE_URL = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { templateId, variables, recipients, integratedNumber } = body;

        if (!templateId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields (templateId, recipients) or recipients is empty" },
                { status: 400 }
            );
        }

        if (!MSG91_AUTH_KEY) {
            console.error("[Broadcast API] MSG91_AUTH_KEY is missing");
            return NextResponse.json(
                { error: "Server misconfiguration. Missing API Key." },
                { status: 500 }
            );
        }

        // Format the bulk payload for MSG91
        // MSG91 bulk template expects an array of messages
        const messages = recipients.map((phone: string) => {
            // Prepare the body parameters for each template
            // By default, assuming all recipients get the same variables for this simple broadcast
            // In a real scenario, CSV parsing might map specific variables per phone
            const bodyValues = Object.keys(variables || {}).map(key => variables[key]);

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
            integrated_number: integratedNumber || process.env.MSG91_INTEGRATED_NUMBER,
            template: {
                name: templateId,
                language: {
                    // Assuming english, but ideally this comes from the template object itself
                    policy: "deterministic",
                    code: "en"
                }
            },
            messages: messages
        };

        console.log("[Broadcast API] Sending MSG91 Bulk Payload:", JSON.stringify(payload, null, 2));

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
                { error: data.message || "Failed to send bulk broadcast via MSG91" },
                { status: 400 }
            );
        }

        // Broadcasts don't necessarily create conversations immediately unless they reply, 
        // but we could log the broadcast campaign into Supabase here for analytics.
        // For now, returning success.

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("[Broadcast API] Internal error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
