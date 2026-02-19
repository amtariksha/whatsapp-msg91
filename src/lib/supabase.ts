import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Server client (API routes) — bypasses RLS ────────────
// Falls back to publishable key if service key not set
export const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey || supabasePublishableKey,
    {
        auth: { persistSession: false },
    }
);

// ─── Public client (for potential client-side realtime) ────
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
