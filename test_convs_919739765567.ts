import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { data: contacts } = await supabase.from("contacts").select("id, name, phone").eq("phone", "919739765567");
    console.log("Contacts:", contacts);
    
    if (contacts && contacts.length > 0) {
        const contactId = contacts[0].id;
        const { data: convs } = await supabase.from("conversations").select("*").eq("contact_id", contactId);
        console.log("Conversations for 919739765567:", JSON.stringify(convs, null, 2));
    }
}
check();
