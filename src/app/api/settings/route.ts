import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── GET /api/settings ─────────────────────────────────────
export async function GET() {
    const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("key, value");

    if (error) {
        console.error("Settings fetch error:", error);
        return NextResponse.json({}, { status: 500 });
    }

    const settings: Record<string, string> = {};
    for (const row of data || []) {
        settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
}

// ─── PUT /api/settings ─────────────────────────────────────
export async function PUT(request: NextRequest) {
    const body = await request.json();

    if (!body || typeof body !== "object") {
        return NextResponse.json(
            { error: "Request body must be a key-value object" },
            { status: 400 }
        );
    }

    const now = new Date().toISOString();
    const entries = Object.entries(body).filter(
        ([, v]) => typeof v === "string"
    );

    if (entries.length === 0) {
        return NextResponse.json(
            { error: "No valid settings provided" },
            { status: 400 }
        );
    }

    const rows = entries.map(([key, value]) => ({
        key,
        value: value as string,
        updated_at: now,
    }));

    const { error } = await supabaseAdmin
        .from("app_settings")
        .upsert(rows, { onConflict: "key" });

    if (error) {
        console.error("Settings update error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    // Return updated settings
    const { data } = await supabaseAdmin
        .from("app_settings")
        .select("key, value");

    const settings: Record<string, string> = {};
    for (const row of data || []) {
        settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
}
