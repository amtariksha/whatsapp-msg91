import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrgId, orgError } from "@/lib/org-helpers";
import type { WhatsAppNumber } from "@/lib/types";

/**
 * GET /api/numbers
 * Fetch configured numbers for the current organization.
 */
export async function GET(request: NextRequest) {
    const orgId = getOrgId(request);
    if (!orgId) return orgError();

    try {
        const { data: dbNumbers, error } = await supabaseAdmin
            .from("integrated_numbers")
            .select("*")
            .eq("organization_id", orgId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching integrated_numbers from DB:", error);
            return NextResponse.json({ error: "Failed to fetch numbers" }, { status: 500 });
        }

        const numbers: WhatsAppNumber[] = (dbNumbers || []).map((dbNum, index) => ({
            id: dbNum.id,
            number: dbNum.number,
            label: dbNum.label || `Number ${index + 1}`,
            isDefault: index === 0,
            provider: dbNum.provider,
            metaWabaId: dbNum.meta_waba_id,
            metaPhoneNumberId: dbNum.meta_phone_number_id,
            metaAccessToken: dbNum.meta_access_token,
        }));

        return NextResponse.json(numbers);
    } catch (err) {
        console.error("API error /api/numbers:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/numbers
 * Add a new integrated number.
 */
export async function POST(req: NextRequest) {
    const orgId = getOrgId(req);
    if (!orgId) return orgError();

    try {
        const body = await req.json();
        const { number, label, provider, metaWabaId, metaPhoneNumberId, metaAccessToken } = body;

        if (!number) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const cleanNumber = number.replace(/^\+/, "");

        const { data, error } = await supabaseAdmin
            .from("integrated_numbers")
            .insert([{
                organization_id: orgId,
                number: cleanNumber,
                label,
                provider: provider || "msg91",
                meta_waba_id: metaWabaId,
                meta_phone_number_id: metaPhoneNumberId,
                meta_access_token: metaAccessToken,
            }])
            .select()
            .single();

        if (error) {
            console.error("Error adding integrated_number:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("POST /api/numbers error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * PATCH /api/numbers
 * Update an integrated number.
 */
export async function PATCH(req: NextRequest) {
    const orgId = getOrgId(req);
    if (!orgId) return orgError();

    try {
        const body = await req.json();
        const { id, label, provider, metaWabaId, metaPhoneNumberId, metaAccessToken } = body;

        if (!id) {
            return NextResponse.json({ error: "Number ID is required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("integrated_numbers")
            .update({
                label,
                provider,
                meta_waba_id: metaWabaId,
                meta_phone_number_id: metaPhoneNumberId,
                meta_access_token: metaAccessToken,
            })
            .eq("id", id)
            .eq("organization_id", orgId)
            .select()
            .single();

        if (error) {
            console.error("Error updating integrated_number:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("PATCH /api/numbers error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/numbers
 * Delete an integrated number.
 */
export async function DELETE(req: NextRequest) {
    const orgId = getOrgId(req);
    if (!orgId) return orgError();

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Number ID is required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("integrated_numbers")
            .delete()
            .eq("id", id)
            .eq("organization_id", orgId);

        if (error) {
            console.error("Error deleting integrated_number:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/numbers error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
