import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runTest() {
    console.log("Simulating database insertion...");

    // 1. Get a valid conversation ID
    const { data: conv } = await supabaseAdmin.from("conversations").select("id").limit(1).single();

    if (!conv) {
        console.log("No conversations found to test with.");
        return;
    }

    const insertPayload = {
        conversation_id: conv.id,
        direction: "inbound",
        content_type: "text",
        body: "Test direct insertion",
        status: "delivered",
    };

    console.log("Inserting payload:", insertPayload);

    const { error } = await supabaseAdmin.from("messages").insert(insertPayload);

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert succeeded!");

        // cleanup
        await supabaseAdmin.from("messages").delete().eq("body", "Test direct insertion");
    }
}

runTest();
