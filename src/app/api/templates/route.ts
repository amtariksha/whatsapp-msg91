import { NextResponse } from "next/server";

const MSG91_TEMPLATE_API =
    "https://control.msg91.com/api/v5/whatsapp/whatsapp-get-template";

/**
 * GET /api/templates
 * Proxy to MSG91 template listing API.
 * Returns the list of WhatsApp templates.
 */
export async function GET() {
    try {
        const authKey = process.env.MSG91_AUTH_KEY;

        if (!authKey) {
            return NextResponse.json(
                { error: "MSG91_AUTH_KEY not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(MSG91_TEMPLATE_API, {
            headers: {
                authkey: authKey,
            },
            next: { revalidate: 300 }, // Cache for 5 minutes
        });

        const data = await response.json();

        if (!response.ok) {
            // Return mock templates on error for development
            return NextResponse.json(getMockTemplates());
        }

        // If MSG91 returns an array, return it directly; otherwise wrap
        const templates = Array.isArray(data) ? data : data.data || data.templates || [];
        return NextResponse.json(templates);
    } catch {
        // Return mock templates for development/testing
        return NextResponse.json(getMockTemplates());
    }
}

function getMockTemplates() {
    return [
        {
            id: "tpl-1",
            name: "welcome_message",
            status: "approved",
            language: "en",
            category: "MARKETING",
            components: [
                {
                    type: "BODY",
                    text: "Hello {{1}}, welcome to our store! Your order {{2}} has been confirmed.",
                },
            ],
        },
        {
            id: "tpl-2",
            name: "order_update",
            status: "approved",
            language: "en",
            category: "UTILITY",
            components: [
                {
                    type: "BODY",
                    text: "Hi {{1}}, your order #{{2}} has been {{3}}. Track it here: {{4}}",
                },
            ],
        },
        {
            id: "tpl-3",
            name: "payment_reminder",
            status: "approved",
            language: "en",
            category: "UTILITY",
            components: [
                {
                    type: "BODY",
                    text: "Dear {{1}}, your payment of ₹{{2}} is pending. Please pay before {{3}}.",
                },
            ],
        },
        {
            id: "tpl-4",
            name: "promotional_draft",
            status: "pending",
            language: "en",
            category: "MARKETING",
            components: [
                {
                    type: "BODY",
                    text: "Hey {{1}}, check out our latest deals!",
                },
            ],
        },
    ];
}
