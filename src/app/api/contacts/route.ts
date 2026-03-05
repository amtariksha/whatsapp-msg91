import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrgId, orgError } from "@/lib/org-helpers";

function mapContact(row: Record<string, unknown>) {
    return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email || undefined,
        tags: row.tags || [],
        customFields: row.custom_fields || {},
        createdAt: row.created_at,
    };
}

// ─── GET /api/contacts ─────────────────────────────────────
export async function GET(request: NextRequest) {
    const orgId = getOrgId(request);
    if (!orgId) return orgError();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();

    let query = supabaseAdmin
        .from("contacts")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

    if (search) {
        query = query.or(
            `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
        );
    }

    const { data, error } = await query;

    if (error) {
        console.error("Contacts fetch error:", error);
        return NextResponse.json([]);
    }

    return NextResponse.json((data || []).map(mapContact));
}

// ─── POST /api/contacts ────────────────────────────────────
export async function POST(request: NextRequest) {
    const orgId = getOrgId(request);
    if (!orgId) return orgError();

    const body = await request.json();

    const { data, error } = await supabaseAdmin
        .from("contacts")
        .insert({
            organization_id: orgId,
            name: body.name || "Unknown",
            phone: body.phone,
            email: body.email || null,
            tags: body.tags || [],
        })
        .select()
        .single();

    if (error) {
        console.error("Create contact error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapContact(data), { status: 201 });
}
