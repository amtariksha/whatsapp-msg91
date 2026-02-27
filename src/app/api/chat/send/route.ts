import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── POST /api/chat/send ──────────────────────────────────
export async function POST(request: NextRequest) {
    const body = await request.json();
    const {
        to,
        contentType,
        conversationId,
        integratedNumber,
    } = body;

    // Clean phone number (remove + prefix if present)
    const phone = to.replace(/^\+/, "");
    const sendFromNumber = integratedNumber || process.env.MSG91_INTEGRATED_NUMBER || "919999999999";

    // ─── Fetch number config from DB ───────────────────────
    const { data: numConfig } = await supabaseAdmin
        .from("integrated_numbers")
        .select("*")
        .eq("number", sendFromNumber)
        .single();

    // Default to msg91 if not found in db
    const provider = numConfig?.provider || "msg91";

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
    } else if (contentType === "location") {
        const { location } = body as Record<string, any>;
        msg91Payload = {
            integrated_number: sendFromNumber,
            content_type: "location",
            payload: {
                to: phone,
                type: "location",
                location: {
                    longitude: location.longitude,
                    latitude: location.latitude,
                    name: location.name,
                    address: location.address,
                },
            },
        };
        messageBody = `[Location: ${location.name || location.address}]`;
    } else if (contentType === "contact") {
        const { contacts } = body as Record<string, any>;
        msg91Payload = {
            integrated_number: sendFromNumber,
            content_type: "contacts", // MSG91 uses 'contacts' for the type
            payload: {
                to: phone,
                type: "contacts",
                contacts: contacts,
            },
        };
        messageBody = `[Contact: ${contacts?.[0]?.name?.formatted_name || "Shared Contact"}]`;
    } else if (contentType === "interactive") {
        const { interactive, text } = body as Record<string, any>;
        msg91Payload = {
            integrated_number: sendFromNumber,
            content_type: "interactive",
            payload: {
                to: phone,
                type: "interactive",
                interactive: interactive,
            },
        };
        // For local storage, if it's buttons, we want to store the body text
        messageBody = interactive?.body?.text || text || "[Interactive Message]";
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

    let finalStatus = "sent";
    let finalResponse: unknown = null;

    if (provider === "meta") {
        // ─── Send via Meta Cloud API ──────────────────────────────
        const metaPhoneNumberId = numConfig?.meta_phone_number_id;
        const metaAccessToken = numConfig?.meta_access_token;
        if (!metaPhoneNumberId || !metaAccessToken) {
            return NextResponse.json({ error: "Meta credentials not configured for this number" }, { status: 500 });
        }

        let metaPayload: Record<string, unknown> = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone,
        };

        if (contentType === "template") {
            const { templateName, templateLanguage, components } = body;
            const mappedComponents = Object.entries(components || {}).map(([key, value]: [string, any]) => ({
                type: value.type,
                parameters: [{
                    type: "text",
                    text: value.value
                }]
            }));

            metaPayload = {
                ...metaPayload,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: templateLanguage || "en" },
                    components: mappedComponents.length > 0 ? [{ type: "body", parameters: mappedComponents.map(c => c.parameters[0]) }] : [],
                },
            };
        } else if (contentType === "document" || contentType === "image") {
            const { mediaUrl, fileName } = body;
            const mediaType = contentType === "image" ? "image" : "document";
            metaPayload = {
                ...metaPayload,
                type: mediaType,
                [mediaType]: {
                    link: mediaUrl,
                    ...(fileName && mediaType === "document" ? { filename: fileName } : {}),
                },
            };
        } else {
            // Default text
            const { text } = body;
            metaPayload = {
                ...metaPayload,
                type: "text",
                text: { preview_url: false, body: text },
            };
        }

        try {
            const response = await fetch(
                `https://graph.facebook.com/v19.0/${metaPhoneNumberId}/messages`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${metaAccessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(metaPayload),
                }
            );

            const responseText = await response.text();
            try { finalResponse = JSON.parse(responseText); } catch { finalResponse = responseText; }

            if (!response.ok) {
                console.error("[Chat Send] Meta error:", response.status, responseText);
                finalStatus = "failed";
            } else {
                console.log("[Chat Send] Meta success:", responseText);
                const data = finalResponse as { messages?: { id: string }[] };
                if (data?.messages?.[0]?.id) {
                    // Save the Meta message ID. Wait, I'll store it in msg91_message_id for now 
                    // or maybe create a meta_message_id column? Let's use request_id for it
                }
            }
        } catch (err) {
            console.error("[Chat Send] Meta network error:", err);
            finalStatus = "failed";
        }
    } else {
        // ─── Send via MSG91 ──────────────────────────────────────
        const authKey = process.env.MSG91_AUTH_KEY;
        if (!authKey) {
            return NextResponse.json({ error: "MSG91_AUTH_KEY not configured" }, { status: 500 });
        }

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
            try { finalResponse = JSON.parse(responseText); } catch { finalResponse = responseText; }

            if (!response.ok) {
                console.error("[Chat Send] MSG91 error:", response.status, responseText);
                console.error("[Chat Send] Payload was:", JSON.stringify(msg91Payload, null, 2));
                finalStatus = "failed";
            } else {
                console.log("[Chat Send] MSG91 success:", responseText);
            }
        } catch (err) {
            console.error("[Chat Send] MSG91 network error:", err);
            finalStatus = "failed";
        }
    }

    // Extract provider message ID for delivery report correlation
    const metaMessageId = provider === "meta" && (finalResponse as any)?.messages?.[0]?.id
        ? (finalResponse as any).messages[0].id
        : undefined;
    const msg91RequestId = provider !== "meta" && typeof finalResponse === "object" && finalResponse !== null
        ? ((finalResponse as any).data?.requestId || (finalResponse as any).requestId || (finalResponse as any).data?.request_id)
        : undefined;
    const providerMessageId = metaMessageId || msg91RequestId || undefined;

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
            status: finalStatus,
            is_internal_note: false,
            integrated_number: sendFromNumber,
            request_id: providerMessageId,
            external_id: providerMessageId,
        })
        .select()
        .single();

    if (msgError) {
        console.error("[Chat Send] Message persist error:", msgError);
        return NextResponse.json(
            { error: "Failed to save message", msg91Status: finalStatus },
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
        providerResponse: finalResponse,
    });
}
