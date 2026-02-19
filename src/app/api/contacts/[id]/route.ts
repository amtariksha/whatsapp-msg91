import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

// ─── GET /api/contacts/[id] ───────────────────────────────
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json(mapContact(data));
}

// ─── PATCH /api/contacts/[id] ─────────────────────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.tags) updateData.tags = body.tags;
    if (body.name) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;

    const { data, error } = await supabaseAdmin
        .from("contacts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error || !data) {
        return NextResponse.json(
            { error: "Failed to update contact" },
            { status: 500 }
        );
    }

    return NextResponse.json(mapContact(data));
}
