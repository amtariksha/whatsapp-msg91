import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Extract organization ID from the middleware-injected header.
 */
export function getOrgId(request: NextRequest): string | null {
    return request.headers.get("x-organization-id");
}

/**
 * Return a 403 response when org context is missing.
 */
export function orgError() {
    return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
    );
}

/**
 * Fetch org's MSG91 auth key, falling back to env var.
 */
export async function getMsg91AuthKey(orgId: string): Promise<string> {
    const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("msg91_auth_key")
        .eq("id", orgId)
        .single();

    return org?.msg91_auth_key || process.env.MSG91_AUTH_KEY || "";
}

/**
 * Fetch org's Razorpay credentials, falling back to env vars.
 */
export async function getRazorpayKeys(orgId: string): Promise<{ keyId: string; keySecret: string }> {
    const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("razorpay_key_id, razorpay_key_secret")
        .eq("id", orgId)
        .single();

    return {
        keyId: org?.razorpay_key_id || process.env.RAZORPAY_KEY_ID || "",
        keySecret: org?.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET || "",
    };
}
