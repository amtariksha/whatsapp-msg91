import { NextRequest, NextResponse } from "next/server";
import { formatPhone } from "@/lib/utils";

const MSG91_API = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";

/**
 * POST /api/chat/send
 * Proxy to MSG91 WhatsApp outbound message API.
 * Hides the auth key from the client.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const authKey = process.env.MSG91_AUTH_KEY;

        if (!authKey) {
            return NextResponse.json(
                { error: "MSG91_AUTH_KEY not configured" },
                { status: 500 }
            );
        }

        const integratedNumber = body.integratedNumber;
        if (!integratedNumber) {
            return NextResponse.json(
                { error: "integratedNumber is required" },
                { status: 400 }
            );
        }

        const to = formatPhone(body.to);
        let msg91Payload: Record<string, unknown>;

        if (body.contentType === "text") {
            // ─── Text Message ──────────────────────────────────
            msg91Payload = {
                integrated_number: integratedNumber,
                content_type: "text",
                payload: {
                    to,
                    type: "text",
                    text: { body: body.text },
                },
            };
        } else if (body.contentType === "template") {
            // ─── Template Message ──────────────────────────────
            const componentsMap: Record<string, { type: string; value: string }> =
                body.components || {};

            msg91Payload = {
                integrated_number: integratedNumber,
                content_type: "template",
                template: {
                    name: body.templateName,
                    language: {
                        code: body.templateLanguage || "en",
                        policy: "deterministic",
                    },
                    to_and_components: [
                        {
                            to: [to],
                            components: componentsMap,
                        },
                    ],
                },
            };
        } else {
            return NextResponse.json(
                { error: "Invalid contentType. Use 'text' or 'template'." },
                { status: 400 }
            );
        }

        const response = await fetch(MSG91_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                authkey: authKey,
            },
            body: JSON.stringify(msg91Payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: "MSG91 API error", details: data },
                { status: response.status }
            );
        }

        // Return a mock message object for the UI
        return NextResponse.json({
            id: `msg-${Date.now()}`,
            conversationId: body.conversationId,
            direction: "outbound",
            contentType: body.contentType,
            body:
                body.contentType === "text"
                    ? body.text
                    : `Template: ${body.templateName}`,
            status: "sent",
            isInternalNote: false,
            timestamp: new Date().toISOString(),
            msg91Response: data,
        });
    } catch (error) {
        console.error("Send message error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
