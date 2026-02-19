import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_PATHS = [
    "/login",
    "/api/auth/login",
    "/api/webhooks/",
    "/_next/",
    "/favicon.ico",
];

function isPublic(pathname: string): boolean {
    return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (isPublic(pathname)) {
        return NextResponse.next();
    }

    const token = request.cookies.get(AUTH_COOKIE)?.value;

    if (!token) {
        // API routes get 401
        if (pathname.startsWith("/api/")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        // Pages redirect to login
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = await verifyToken(token);

    if (!payload) {
        // Invalid/expired token
        const response = pathname.startsWith("/api/")
            ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            : NextResponse.redirect(new URL("/login", request.url));

        // Clear invalid cookie
        response.cookies.delete(AUTH_COOKIE);
        return response;
    }

    // Attach user info to request headers for API routes
    const res = NextResponse.next();
    res.headers.set("x-user-id", payload.userId);
    res.headers.set("x-user-email", payload.email);
    res.headers.set("x-user-role", payload.role);
    res.headers.set("x-user-name", payload.name);

    return res;
}

export const config = {
    matcher: [
        /*
         * Match all paths except static files
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
