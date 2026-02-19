import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── POST /api/chat/send ──────────────────────────────────
export async function POST(request: NextRequest) {
    const body = await request.json();
    const authKey = process.env.MSG91_AUTH_KEY;

    if (!authKey) {
        return NextResponse.json(
            { error: "MSG91_AUTH_KEY not configured" },
            { status: 500 }
        );
    }

    const {
        to,
        contentType,
        conversationId,
        integratedNumber,
    } = body;

    // Clean phone number (remove + prefix if present)
    const phone = to.replace(/^\+/, "");

    let msg91Payload: Record<string, unknown>;
    let messageBody = "";

    if (contentType === "template") {
        const { templateName, templateLanguage, components } = body;
        msg91Payload = {
            integrated_number: integratedNumber || "919999999999",
            content_type: "template",
            payload: {
                to: phone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: templateLanguage || "en" },
                    components: Object.values(components || {}),
                },
            },
        };
        messageBody = `[Template: ${templateName}]`;
    } else {
        const { text } = body;
        msg91Payload = {
            integrated_number: integratedNumber || "919999999999",
            content_type: "text",
            payload: {
                to: phone,
                type: "text",
                text: { body: text },
            },
        };
        messageBody = text;
    }

    // ─── Send via MSG91 ──────────────────────────────────────
    let msg91Status = "sent";
    try {
        const response = await fetch(
            "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
            {
                method: "POST",
                headers: {
                    authkey: authKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(msg91Payload),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("MSG91 error:", errorText);
            msg91Status = "failed";
        }
    } catch (err) {
        console.error("MSG91 send error:", err);
        msg91Status = "failed";
    }

    // ─── Persist message in Supabase ─────────────────────────
    const { data: message, error: msgError } = await supabaseAdmin
        .from("messages")
        .insert({
            conversation_id: conversationId,
            direction: "outbound",
            content_type: contentType || "text",
            body: messageBody,
            status: msg91Status,
            is_internal_note: false,
        })
        .select()
        .single();

    if (msgError) {
        console.error("Message persist error:", msgError);
    }

    // ─── Update conversation's last_message ──────────────────
    if (conversationId) {
        await supabaseAdmin
            .from("conversations")
            .update({
                last_message: messageBody,
                last_message_time: new Date().toISOString(),
            })
            .eq("id", conversationId);
    }

    return NextResponse.json({
        success: msg91Status !== "failed",
        messageId: message?.id || null,
        status: msg91Status,
    });
}
