import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { data: convs } = await supabase.from("conversations").select("id").eq("contact_id", "a2c739ac-11b1-42bf-8d5a-0c707e29cfb1");
    if (convs && convs.length > 0) {
        const { data: msgs } = await supabase.from("messages").select("id, body, created_at, status, direction").eq("conversation_id", convs[0].id).order("created_at", { ascending: false }).limit(5);
        console.log("Messages for 919739765567:", JSON.stringify(msgs, null, 2));
    }
}
check();
