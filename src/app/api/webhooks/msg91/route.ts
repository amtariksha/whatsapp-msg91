import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── POST /api/webhooks/msg91 — Receive inbound messages ──
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Log the full payload for debugging
        console.log("[MSG91 Webhook] Received payload:", JSON.stringify(body));

        /*
         * MSG91 "On Inbound Request Received" payload fields:
         *   customerNumber  — sender phone (e.g. "919876543210")
         *   content         — message text
         *   requestId       — MSG91 request ID
         *   eventName       — event type
         *   crqid           — conversation request ID
         *   companyId       — MSG91 company ID
         *   requestedAt     — timestamp
         *   reason          — reason field
         *   uuid            — unique message ID
         *
         * We also handle alternative field names for flexibility.
         */
        const senderPhone =
            body.customerNumber ||
            body.from ||
            body.sender ||
            body.mobile ||
            body.phone ||
            "";
        const receiverNumber =
            body.to ||
            body.receiver ||
            body.integrated_number ||
            "";
        const messageBody =
            body.content ||
            body.message ||
            body.text ||
            body.body ||
            "";
        const contentType = body.type || "text";
        const mediaUrl = body.media_url || body.mediaUrl || null;
        const fileName = body.file_name || body.fileName || null;
        const externalId = body.uuid || body.requestId || null;

        if (!senderPhone) {
            console.log("[MSG91 Webhook] No sender phone found. Payload keys:", Object.keys(body));
            return NextResponse.json(
                { error: "No sender phone found in payload" },
                { status: 400 }
            );
        }

        // Normalize phone (remove + prefix if present)
        const normalizedPhone = senderPhone.replace(/^\+/, "");
        console.log(`[MSG91 Webhook] Processing message from ${normalizedPhone}`);

        // ─── 1. Upsert Contact ─────────────────────────────
        let { data: contact } = await supabaseAdmin
            .from("contacts")
            .select("id, name")
            .eq("phone", normalizedPhone)
            .single();

        if (!contact) {
            const { data: newContact, error: contactError } = await supabaseAdmin
                .from("contacts")
                .insert({
                    name: normalizedPhone, // use phone as name initially
                    phone: normalizedPhone,
                })
                .select("id, name")
                .single();

            if (contactError) {
                console.error("[MSG91 Webhook] Upsert contact error:", contactError);
                return NextResponse.json({ error: "Failed to upsert contact" }, { status: 500 });
            }
            contact = newContact;
            console.log(`[MSG91 Webhook] Created contact: ${contact!.id}`);
        }

        // ─── 2. Upsert Conversation ────────────────────────
        let { data: conversation } = await supabaseAdmin
            .from("conversations")
            .select("id")
            .eq("contact_id", contact!.id)
            .eq("integrated_number", receiverNumber || "default")
            .single();

        if (!conversation) {
            const { data: newConv, error: convError } = await supabaseAdmin
                .from("conversations")
                .insert({
                    contact_id: contact!.id,
                    integrated_number: receiverNumber || "default",
                    status: "open",
                    last_message: messageBody || "[media]",
                    last_message_time: new Date().toISOString(),
                    last_incoming_timestamp: new Date().toISOString(),
                    unread_count: 1,
                })
                .select("id")
                .single();

            if (convError) {
                console.error("[MSG91 Webhook] Create conversation error:", convError);
                return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
            }
            conversation = newConv;
            console.log(`[MSG91 Webhook] Created conversation: ${conversation!.id}`);
        } else {
            // Update existing conversation
            await supabaseAdmin
                .from("conversations")
                .update({
                    status: "open",
                    last_message: messageBody || "[media]",
                    last_message_time: new Date().toISOString(),
                    last_incoming_timestamp: new Date().toISOString(),
                })
                .eq("id", conversation.id);

            // Increment unread count
            const { data: convData } = await supabaseAdmin
                .from("conversations")
                .select("unread_count")
                .eq("id", conversation.id)
                .single();

            if (convData) {
                await supabaseAdmin
                    .from("conversations")
                    .update({ unread_count: (convData.unread_count || 0) + 1 })
                    .eq("id", conversation.id);
            }
        }

        // ─── 3. Insert Message ─────────────────────────────
        const { error: msgError } = await supabaseAdmin.from("messages").insert({
            conversation_id: conversation!.id,
            direction: "inbound",
            content_type: contentType,
            body: messageBody,
            media_url: mediaUrl,
            file_name: fileName,
            status: "delivered",
            external_id: externalId,
        });

        if (msgError) {
            console.error("[MSG91 Webhook] Insert message error:", msgError);
            return NextResponse.json({ error: "Failed to insert message" }, { status: 500 });
        }

        console.log(`[MSG91 Webhook] Message saved for conversation ${conversation!.id}`);
        return NextResponse.json({ success: true, conversationId: conversation!.id });
    } catch (err) {
        console.error("[MSG91 Webhook] Error:", err);
        return NextResponse.json(
            { error: "Invalid payload" },
            { status: 400 }
        );
    }
}
