import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword, signToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return NextResponse.json(
            { error: "Email and password are required" },
            { status: 400 }
        );
    }

    // Find user
    const { data: user, error } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .single();

    if (error || !user) {
        return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 }
        );
    }

    if (!user.is_active) {
        return NextResponse.json(
            { error: "Account is disabled. Contact your admin." },
            { status: 403 }
        );
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
        return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 }
        );
    }

    // Fetch organization
    const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("id, name")
        .eq("id", user.organization_id)
        .single();

    if (!org) {
        return NextResponse.json(
            { error: "No organization found for this user" },
            { status: 403 }
        );
    }

    // Sign JWT
    const token = await signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        organizationId: org.id,
        organizationName: org.name,
    });

    // Set httpOnly cookie
    const response = NextResponse.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: org.id,
            organizationName: org.name,
        },
    });

    response.cookies.set(AUTH_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
}
