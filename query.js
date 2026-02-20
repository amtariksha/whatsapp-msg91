const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_APP_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_APP_KEY';

// I will read env from .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
let url, key;
for (const line of envFile.split('\n')) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].replace(/"/g, '');
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].replace(/"/g, '');
}

const supabase = createClient(url, key);

async function run() {
    const { data: convs } = await supabase.from('conversations').select('id, last_message').order('created_at', { ascending: false }).limit(5);
    console.log("CONVERSATIONS:", JSON.stringify(convs, null, 2));
    
    if (convs && convs.length > 0) {
        const { data: msgs } = await supabase.from('messages').select('id, body').eq('conversation_id', convs[0].id).limit(5);
        console.log("MESSAGES for " + convs[0].id + ":", JSON.stringify(msgs, null, 2));
    }
}
run();
