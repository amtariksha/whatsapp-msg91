import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

// ─── PATCH /api/users/[id] — Update user ──────────────────
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.email !== undefined) updates.email = body.email.toLowerCase().trim();
    if (body.role !== undefined) updates.role = body.role;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.password) {
        updates.password_hash = await hashPassword(body.password);
    }

    const { data, error } = await supabaseAdmin
        .from("users")
        .update(updates)
        .eq("id", id)
        .select("id, name, email, role, is_active, created_at")
        .single();

    if (error) {
        console.error("User update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// ─── DELETE /api/users/[id] — Delete user ─────────────────
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting yourself
    const currentUserId = request.headers.get("x-user-id");
    if (id === currentUserId) {
        return NextResponse.json(
            { error: "You cannot delete your own account" },
            { status: 400 }
        );
    }

    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);

    if (error) {
        console.error("User delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
