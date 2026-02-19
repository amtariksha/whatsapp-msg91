const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

// Load .env.local
const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars. URL:", !!supabaseUrl, "KEY:", !!supabaseKey);
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

    console.log("Creating admin user...");

    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

    if (existing) {
        console.log("Admin user already exists — skipping.");
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
        .from("users")
        .insert({ name, email, password_hash: passwordHash, role, is_active: true })
        .select("id, email, role")
        .single();

    if (error) {
        console.error("Failed to create admin:", error.message);
        process.exit(1);
    }

    console.log("Admin user created:", data);
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Role:", role);
}

main();
