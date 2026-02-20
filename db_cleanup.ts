import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
    console.log("Fetching corrupted conversations...");
    const { data: convs, error: convErr } = await supabase
        .from("conversations")
        .select("id, last_message");

    if (convErr) {
        console.error(convErr);
        return;
    }

    for (const c of convs!) {
        // 1. Reset unread_count based on actual DB messages that are unread
        // Since we don't have message-level read receipts yet, we just set unread_count to 0 or 1
        // Actually, setting to 0 is safest to clear the ghost notifications.
        const { data: msgs } = await supabase
            .from("messages")
            .select("id, direction")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1);

        let unreadCount = 0;
        if (msgs && msgs.length > 0 && msgs[0].direction === "inbound") {
            unreadCount = 1; // Assuming the last message was inbound
        }

        // 2. Fix JSON strings in last_message
        let cleanLastMessage = c.last_message;
        if (typeof cleanLastMessage === "string" && cleanLastMessage.startsWith("{")) {
            try {
                const parsed = JSON.parse(cleanLastMessage);
                if (parsed.text) {
                    cleanLastMessage = parsed.text;
                }
            } catch (e) {
                // ignore
            }
        }

        await supabase
            .from("conversations")
            .update({
                unread_count: unreadCount,
                last_message: cleanLastMessage
            })
            .eq("id", c.id);

        console.log(`Cleaned up conv ${c.id}: unread -> ${unreadCount}, last_message -> ${cleanLastMessage.substring(0, 30)}`);
    }
    console.log("Cleanup complete!");
}

cleanup();
