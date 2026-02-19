import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = await verifyToken(token);

    if (!payload) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
        user: {
            id: payload.userId,
            name: payload.name,
            email: payload.email,
            role: payload.role,
        },
    });
}
