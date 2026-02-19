import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── PATCH /api/quick-replies/[id] ──────────────────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.body !== undefined) updateData.body = body.body;
    if (body.shortcut !== undefined) updateData.shortcut = body.shortcut;

    const { data, error } = await supabaseAdmin
        .from("quick_replies")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        id: data.id,
        title: data.title,
        body: data.body,
        shortcut: data.shortcut || undefined,
        createdAt: data.created_at,
    });
}

// ─── DELETE /api/quick-replies/[id] ─────────────────────────
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const { error } = await supabaseAdmin
        .from("quick_replies")
        .delete()
        .eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
