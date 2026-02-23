import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from 'crypto';

// ─── GET /api/webhooks/meta ─────────────────────────────────
// Handles webhook verification from Meta Developer Portal
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // The token you set in your Meta App Settings
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
        console.log("Meta Webhook Verified!");
        return new NextResponse(challenge, { status: 200 });
    } else {
        return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }
}

// ─── POST /api/webhooks/meta ────────────────────────────────
// Handles incoming messages and status updates from Meta
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 1. Validate payload structure
        if (body.object !== "whatsapp_business_account") {
            return NextResponse.json({ success: true }, { status: 200 });
        }

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value) {
            return NextResponse.json({ success: true }, { status: 200 });
        }

        const integratedNumberId = value.metadata?.phone_number_id;
        const integratedNumberDisplay = value.metadata?.display_phone_number;

        // 2. Handle Status Updates (sent, delivered, read)
        if (value.statuses && value.statuses.length > 0) {
            const statusObj = value.statuses[0];
            const metaMessageId = statusObj.id;
            const newStatus = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

            // We update based on request_id because we saved the Meta message ID there
            await supabaseAdmin
                .from("messages")
                .update({ status: newStatus })
                .eq("request_id", metaMessageId);

            // TODO: Emit socket event for status update if needed
            return NextResponse.json({ success: true }, { status: 200 });
        }

        // 3. Handle Incoming Messages
        if (value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            const contact = value.contacts?.[0];

            const senderPhone = message.from;
            const senderName = contact?.profile?.name || "Unknown";
            const messageType = message.type;
            const metaMessageId = message.id;
            const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

            let messageBody = "";
            let mediaUrl = null;

            if (messageType === "text") {
                messageBody = message.text?.body || "";
            } else if (messageType === "image") {
                messageBody = message.image?.caption || "[Image]";
                // In a real app, you would fetch the media URL from Meta using message.image.id
                mediaUrl = message.image?.id;
            } else if (messageType === "document") {
                messageBody = message.document?.filename || "[Document]";
                mediaUrl = message.document?.id;
            } else if (messageType === "interactive") {
                // E.g. button reply
                if (message.interactive?.type === "button_reply") {
                    messageBody = message.interactive.button_reply.title;
                } else if (message.interactive?.type === "list_reply") {
                    messageBody = message.interactive.list_reply.title;
                } else {
                    messageBody = "[Interactive Response]";
                }
            } else {
                messageBody = `[${messageType}]`;
            }

            // ─── Find or create contact ──────────────────────────────
            let contactId: string;
            const { data: existingContact } = await supabaseAdmin
                .from("contacts")
                .select("id")
                .eq("phone", senderPhone)
                .single();

            if (existingContact) {
                contactId = existingContact.id;
            } else {
                const { data: newContact, error: contactError } = await supabaseAdmin
                    .from("contacts")
                    .insert({ phone: senderPhone, name: senderName })
                    .select("id")
                    .single();

                if (contactError || !newContact) {
                    throw new Error("Failed to create contact");
                }
                contactId = newContact.id;
            }

            // ─── Find or create open conversation ────────────────────
            let conversationId: string;
            const { data: existingConv } = await supabaseAdmin
                .from("conversations")
                .select("id")
                .eq("contact_id", contactId)
                .eq("status", "open")
                .eq("integrated_number", integratedNumberDisplay || integratedNumberId)
                .single();

            if (existingConv) {
                conversationId = existingConv.id;
                // Update last_message
                await supabaseAdmin
                    .from("conversations")
                    .update({
                        last_message: messageBody,
                        last_message_at: timestamp,
                        updated_at: timestamp
                    })
                    .eq("id", conversationId);
            } else {
                const { data: newConv, error: convError } = await supabaseAdmin
                    .from("conversations")
                    .insert({
                        contact_id: contactId,
                        integrated_number: integratedNumberDisplay || integratedNumberId,
                        status: "open",
                        last_message: messageBody,
                        last_message_at: timestamp
                    })
                    .select("id")
                    .single();

                if (convError || !newConv) {
                    throw new Error("Failed to create conversation");
                }
                conversationId = newConv.id;
            }

            // ─── Insert Message ─────────────────────────────────────
            await supabaseAdmin.from("messages").insert({
                conversation_id: conversationId,
                direction: "inbound",
                content_type: messageType === "button_reply" ? "text" : messageType,
                body: messageBody,
                status: "received",
                request_id: metaMessageId,
                integrated_number: integratedNumberDisplay || integratedNumberId,
                media_url: mediaUrl,
                created_at: timestamp
            });

            // TODO: In a production app you would trigger Pusher/Socket.io here 
            // for real-time frontend updates.

            return NextResponse.json({ success: true }, { status: 200 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Meta Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
