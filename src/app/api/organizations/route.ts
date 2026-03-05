import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrgId, orgError } from "@/lib/org-helpers";

// ─── GET /api/organizations — Get current org details ─────
export async function GET(request: NextRequest) {
    const orgId = getOrgId(request);
    if (!orgId) return orgError();

    const { data, error } = await supabaseAdmin
        .from("organizations")
        .select("id, name, slug, msg91_auth_key, razorpay_key_id, razorpay_key_secret, created_at")
        .eq("id", orgId)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Mask sensitive keys — show only last 4 chars
    const mask = (val: string | null) =>
        val ? `${"*".repeat(Math.max(0, val.length - 4))}${val.slice(-4)}` : null;

    return NextResponse.json({
        id: data.id,
        name: data.name,
        slug: data.slug,
        msg91AuthKey: mask(data.msg91_auth_key),
        razorpayKeyId: mask(data.razorpay_key_id),
        razorpayKeySecret: mask(data.razorpay_key_secret),
        hasMsg91Key: !!data.msg91_auth_key,
        hasRazorpayKeys: !!(data.razorpay_key_id && data.razorpay_key_secret),
        createdAt: data.created_at,
    });
}

// ─── PATCH /api/organizations — Update org (admin only) ───
export async function PATCH(request: NextRequest) {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const orgId = getOrgId(request);
    if (!orgId) return orgError();

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.msg91AuthKey !== undefined) updates.msg91_auth_key = body.msg91AuthKey || null;
    if (body.razorpayKeyId !== undefined) updates.razorpay_key_id = body.razorpayKeyId || null;
    if (body.razorpayKeySecret !== undefined) updates.razorpay_key_secret = body.razorpayKeySecret || null;

    const { data, error } = await supabaseAdmin
        .from("organizations")
        .update(updates)
        .eq("id", orgId)
        .select("id, name, slug, created_at")
        .single();

    if (error) {
        console.error("Org update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
