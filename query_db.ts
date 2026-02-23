import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { data: convs } = await supabase.from("conversations").select("*").order("created_at", { ascending: false }).limit(3);
    console.log("Recent conversations:", JSON.stringify(convs, null, 2));
    const { data: msgs } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(3);
    console.log("Recent messages:", JSON.stringify(msgs, null, 2));
}
check();
