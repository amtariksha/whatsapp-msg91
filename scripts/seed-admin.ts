/**
 * Seed the admin user into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
});

async function main() {
    const email = "admin@wacrm.in";
    const password = "Admin@123";
    const name = "Admin";
    const role = "admin";

    console.log("🔑 Creating admin user...");

    // Check if already exists
    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

    if (existing) {
        console.log("ℹ️  Admin user already exists — skipping.");
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
        .from("users")
        .insert({ name, email, password_hash: passwordHash, role, is_active: true })
        .select("id, email, role")
        .single();

    if (error) {
        console.error("❌ Failed to create admin:", error.message);
        process.exit(1);
    }

    console.log("✅ Admin user created:", data);
    console.log(`\n   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     ${role}\n`);
}

main();
