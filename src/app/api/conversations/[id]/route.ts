import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function mapMessage(row: Record<string, unknown>) {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        direction: row.direction,
        contentType: row.content_type || "text",
        body: row.body || "",
        mediaUrl: row.media_url || undefined,
        fileName: row.file_name || undefined,
        status: row.status || "sent",
        isInternalNote: row.is_internal_note || false,
        timestamp: row.created_at,
    };
}

function mapContact(row: Record<string, unknown>) {
    return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        tags: row.tags || [],
        createdAt: row.created_at,
    };
}

// ─── GET /api/conversations/[id] ──────────────────────────
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Fetch conversation with contact
    const { data: conv, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("*, contacts(*)")
        .eq("id", id)
        .single();

    if (convError || !conv) {
        return NextResponse.json(
            { error: "Conversation not found" },
            { status: 404 }
        );
    }

    // Fetch messages for this conversation
    const { data: messages } = await supabaseAdmin
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

    const contact =
        conv.contacts && typeof conv.contacts === "object"
            ? mapContact(conv.contacts as Record<string, unknown>)
            : { id: "", name: "Unknown", phone: "", tags: [], createdAt: "" };

    const result = {
        id: conv.id,
        contactId: conv.contact_id,
        contact,
        integratedNumber: conv.integrated_number,
        status: conv.status,
        lastMessage: conv.last_message || "",
        lastMessageTime: conv.last_message_time,
        lastIncomingTimestamp:
            conv.last_incoming_timestamp || conv.last_message_time,
        unreadCount: conv.unread_count || 0,
        messages: (messages || []).map(mapMessage),
    };

    return NextResponse.json(result);
}

// ─── PATCH /api/conversations/[id] ────────────────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.unreadCount !== undefined) updateData.unread_count = body.unreadCount;

    const { data, error } = await supabaseAdmin
        .from("conversations")
        .update(updateData)
        .eq("id", id)
        .select("*, contacts(*)")
        .single();

    if (error || !data) {
        return NextResponse.json(
            { error: "Failed to update conversation" },
            { status: 500 }
        );
    }

    const contact =
        data.contacts && typeof data.contacts === "object"
            ? mapContact(data.contacts as Record<string, unknown>)
            : { id: "", name: "Unknown", phone: "", tags: [], createdAt: "" };

    return NextResponse.json({
        id: data.id,
        contactId: data.contact_id,
        contact,
        integratedNumber: data.integrated_number,
        status: data.status,
        lastMessage: data.last_message || "",
        lastMessageTime: data.last_message_time,
        lastIncomingTimestamp:
            data.last_incoming_timestamp || data.last_message_time,
        unreadCount: data.unread_count || 0,
        messages: [],
    });
}
