import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── POST /api/webhooks/msg91 — Receive inbound messages ──
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        /*
         * MSG91 sends inbound webhooks with variable payloads.
         * Common fields (may vary):
         *   - from / sender:   sender phone number
         *   - to / receiver:   your WhatsApp number
         *   - message / text:  message body
         *   - type:            text / image / document etc.
         *   - media_url:       for image/document
         *   - timestamp
         */
        const senderPhone =
            body.from || body.sender || body.mobile || body.phone || "";
        const receiverNumber =
            body.to || body.receiver || body.integrated_number || "";
        const messageBody =
            body.message || body.text || body.body || body.content || "";
        const contentType = body.type || "text";
        const mediaUrl = body.media_url || body.mediaUrl || null;
        const fileName = body.file_name || body.fileName || null;

        if (!senderPhone) {
            return NextResponse.json(
                { error: "No sender phone found in payload" },
                { status: 400 }
            );
        }

        // Normalize phone (remove + prefix if present)
        const normalizedPhone = senderPhone.replace(/^\+/, "");

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
                console.error("Upsert contact error:", contactError);
                return NextResponse.json({ error: "Failed to upsert contact" }, { status: 500 });
            }
            contact = newContact;
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
                console.error("Create conversation error:", convError);
                return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
            }
            conversation = newConv;
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

            // Increment unread count via raw SQL-style update
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
        });

        if (msgError) {
            console.error("Insert message error:", msgError);
            return NextResponse.json({ error: "Failed to insert message" }, { status: 500 });
        }

        return NextResponse.json({ success: true, conversationId: conversation!.id });
    } catch (err) {
        console.error("MSG91 webhook error:", err);
        return NextResponse.json(
            { error: "Invalid payload" },
            { status: 400 }
        );
    }
}
