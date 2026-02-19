import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── PATCH /api/reminders/[id] ──────────────────────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.is_dismissed !== undefined) updateData.is_dismissed = body.is_dismissed;
    if (body.remind_at) updateData.remind_at = body.remind_at;
    if (body.note !== undefined) updateData.note = body.note;

    const { error } = await supabaseAdmin
        .from("reminders")
        .update(updateData)
        .eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// ─── DELETE /api/reminders/[id] ─────────────────────────────
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const { error } = await supabaseAdmin
        .from("reminders")
        .delete()
        .eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
