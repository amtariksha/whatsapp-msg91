import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runTest() {
    console.log("Checking recent contacts...");
    const { data: contacts, error: contactError } = await supabaseAdmin
        .from("contacts")
        .select("id, name, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
    console.table(contacts);

    console.log("Checking recent conversations...");
    const { data: convs, error: convError } = await supabaseAdmin
        .from("conversations")
        .select("id, contact_id, integrated_number, last_message, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
    console.table(convs);

    console.log("Checking recent messages (up to 50)...");
    const { data: msgs, error: msgsError } = await supabaseAdmin
        .from("messages")
        .select("id, conversation_id, direction, status, body, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
    console.table(msgs);
}

runTest();
