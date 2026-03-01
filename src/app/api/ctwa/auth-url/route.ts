import { NextResponse } from "next/server";

const META_API_VERSION = process.env.META_API_VERSION || "v21.0";

// ─── GET /api/ctwa/auth-url ──────────────────────────────────
// Returns the Facebook OAuth authorization URL
export async function GET() {
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = process.env.FACEBOOK_OAUTH_REDIRECT_URI;

    if (!appId || !redirectUri) {
        return NextResponse.json(
            { error: "FACEBOOK_APP_ID or FACEBOOK_OAUTH_REDIRECT_URI not configured" },
            { status: 500 }
        );
    }

    const scopes = [
        "ads_read",
        "pages_read_engagement",
        "business_management",
    ].join(",");

    const url = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?` +
        `client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code` +
        `&state=ctwa_connect`;

    return NextResponse.json({ url });
}
