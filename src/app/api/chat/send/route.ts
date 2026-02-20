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
    const sendFromNumber = integratedNumber || process.env.MSG91_INTEGRATED_NUMBER || "919999999999";

    let msg91Payload: Record<string, unknown>;
    let messageBody = "";

    if (contentType === "template") {
        const { templateName, templateLanguage, components } = body;
        msg91Payload = {
            integrated_number: sendFromNumber,
            content_type: "template",
            payload: {
                to: phone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: templateLanguage || "en" },
                    components: components || [],
                },
            },
        };
        messageBody = `[Template: ${templateName}]`;
    } else if (contentType === "document" || contentType === "image") {
        const { mediaUrl, fileName } = body;
        const mediaType = contentType === "image" ? "image" : "document";
        msg91Payload = {
            integrated_number: sendFromNumber,
            content_type: mediaType,
            payload: {
                to: phone,
                type: mediaType,
                [mediaType]: {
                    link: mediaUrl,
                    ...(fileName ? { filename: fileName } : {}),
                },
            },
        };
        messageBody = fileName || `[${mediaType}]`;
    } else {
        const { text } = body;
        msg91Payload = {
            integrated_number: sendFromNumber,
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
    let msg91Response: unknown = null;
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

        const responseText = await response.text();
        try { msg91Response = JSON.parse(responseText); } catch { msg91Response = responseText; }

        if (!response.ok) {
            console.error("[Chat Send] MSG91 error:", response.status, responseText);
            console.error("[Chat Send] Payload was:", JSON.stringify(msg91Payload, null, 2));
            msg91Status = "failed";
        } else {
            console.log("[Chat Send] MSG91 success:", responseText);
        }
    } catch (err) {
        console.error("[Chat Send] MSG91 network error:", err);
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
            media_url: body.mediaUrl || null,
            file_name: body.fileName || null,
            status: msg91Status,
            is_internal_note: false,
            integrated_number: sendFromNumber,
        })
        .select()
        .single();

    if (msgError) {
        console.error("[Chat Send] Message persist error:", msgError);
        return NextResponse.json(
            { error: "Failed to save message", msg91Status },
            { status: 500 }
        );
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

    // Return full message object for frontend
    return NextResponse.json({
        id: message.id,
        conversationId: message.conversation_id,
        direction: message.direction,
        contentType: message.content_type || "text",
        body: message.body || "",
        mediaUrl: message.media_url || undefined,
        fileName: message.file_name || undefined,
        status: message.status || "sent",
        isInternalNote: message.is_internal_note || false,
        timestamp: message.created_at,
        msg91Response,
    });
}
