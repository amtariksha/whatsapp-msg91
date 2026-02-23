import { supabaseAdmin } from './src/lib/supabase';
async function test() {
    const { data } = await supabaseAdmin.from('conversations').select('id, contact_id, integrated_number, status, last_message, last_message_time');
    console.log(data);
}
test();
