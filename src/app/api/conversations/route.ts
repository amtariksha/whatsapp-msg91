import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── Supabase row → app Contact type mapper ───────────────
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

// ─── Supabase row → app Conversation type mapper ──────────
function mapConversation(row: Record<string, unknown>) {
    const rawContact =
        row.contacts && typeof row.contacts === "object"
            ? (row.contacts as Record<string, unknown>)
            : null;

    const contact = rawContact
        ? mapContact(rawContact)
        : { id: "", name: "Unknown", phone: "", tags: [] as string[], createdAt: "" };

    return {
        id: row.id as string,
        contactId: row.contact_id as string,
        contact: contact as { id: string; name: string; phone: string; email?: string; tags: string[]; createdAt: string },
        integratedNumber: row.integrated_number as string,
        status: row.status as string,
        assignedTo: (row.assigned_to as string) || undefined,
        assignedAt: (row.assigned_at as string) || undefined,
        lastMessage: (row.last_message as string) || "",
        lastMessageTime: row.last_message_time as string,
        lastIncomingTimestamp: (row.last_incoming_timestamp as string) || (row.last_message_time as string),
        unreadCount: (row.unread_count as number) || 0,
        messages: [] as Array<Record<string, unknown>>, // Messages loaded separately via [id] route
    };
}

// ─── GET /api/conversations ────────────────────────────────
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase();

    let query = supabaseAdmin
        .from("conversations")
        .select("*, contacts(*)")
        .order("last_message_time", { ascending: false });

    if (status && status !== "all") {
        query = query.eq("status", status);
    }

    if (search) {
        // Search by contact name or phone — use contacts table filter
        query = query.or(
            `contacts.name.ilike.%${search}%,contacts.phone.ilike.%${search}%`
        );
    }

    const { data, error } = await query;

    if (error) {
        console.error("Supabase conversations error:", error);
        return NextResponse.json([], { status: 200 });
    }

    // Filter out rows where the joined contact didn't match the search
    let results = (data || []).map(mapConversation);
    if (search) {
        results = results.filter(
            (c) =>
                c.contact.name.toLowerCase().includes(search) ||
                c.contact.phone.includes(search)
        );
    }

    return NextResponse.json(results);
}

// ─── POST /api/conversations ───────────────────────────────
export async function POST(request: NextRequest) {
    const body = await request.json();

    const { data, error } = await supabaseAdmin
        .from("conversations")
        .insert({
            contact_id: body.contactId,
            integrated_number: body.integratedNumber || "919999999999",
            status: "open",
            last_message: "",
            last_message_time: new Date().toISOString(),
            last_incoming_timestamp: new Date().toISOString(),
            unread_count: 0,
        })
        .select("*, contacts(*)")
        .single();

    if (error) {
        console.error("Create conversation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapConversation(data), { status: 201 });
}
