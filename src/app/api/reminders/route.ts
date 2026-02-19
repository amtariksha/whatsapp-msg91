import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import * as jose from "jose";

async function getCurrentUserId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        if (!token) return null;
        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || "whatsapp-crm-secret-key-2024"
        );
        const { payload } = await jose.jwtVerify(token, secret);
        return payload.userId as string;
    } catch {
        return null;
    }
}

// ─── GET /api/reminders ─────────────────────────────────────
export async function GET() {
    const userId = await getCurrentUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
        .from("reminders")
        .select("*, conversations(contact_id, contacts(name, phone))")
        .eq("user_id", userId)
        .eq("is_dismissed", false)
        .order("remind_at", { ascending: true });

    if (error) {
        console.error("Fetch reminders error:", error);
        return NextResponse.json([], { status: 200 });
    }

    const reminders = (data || []).map((r: Record<string, unknown>) => {
        const conv = r.conversations as Record<string, unknown> | null;
        const contact = conv?.contacts as Record<string, unknown> | null;
        return {
            id: r.id,
            conversationId: r.conversation_id,
            userId: r.user_id,
            remindAt: r.remind_at,
            note: r.note || undefined,
            isDismissed: r.is_dismissed,
            createdAt: r.created_at,
            contactName: contact?.name || "Unknown",
            contactPhone: contact?.phone || "",
        };
    });

    return NextResponse.json(reminders);
}

// ─── POST /api/reminders ────────────────────────────────────
export async function POST(request: NextRequest) {
    const userId = await getCurrentUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabaseAdmin
        .from("reminders")
        .insert({
            conversation_id: body.conversationId,
            user_id: userId,
            remind_at: body.remindAt,
            note: body.note || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Create reminder error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        id: data.id,
        conversationId: data.conversation_id,
        userId: data.user_id,
        remindAt: data.remind_at,
        note: data.note || undefined,
        isDismissed: data.is_dismissed,
        createdAt: data.created_at,
    }, { status: 201 });
}
