import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log("Checking columns of 'messages' table...");
    const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .limit(1);

    if (error) {
        console.error(error);
    } else {
        if (msgs && msgs.length > 0) {
            console.log(Object.keys(msgs[0]));
        } else {
            console.log("No messages, can't infer columns from empty * select unless metadata exists.");
            // Introspect using RPC or just inserting a dummy test
        }
    }
}

check();
