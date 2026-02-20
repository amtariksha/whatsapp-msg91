const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let url, key;
for (const line of envFile.split('\n')) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/"/g, '');
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/"/g, '');
}

const supabase = createClient(url, key);

async function run() {
    const { data: convs } = await supabase.from('conversations').select('*');
    if (!convs) return console.log('No convs');

    let count = 0;
    for (const conv of convs) {
        const { data: msgs } = await supabase.from('messages').select('id').eq('conversation_id', conv.id);
        if (!msgs || msgs.length === 0) {
            let body = conv.last_message || '[No text]';
            try {
                // If it's literally the string '{"text":"something"}'
                const parsed = JSON.parse(body);
                if (parsed && typeof parsed === 'object' && parsed.text) {
                    body = parsed.text;
                }
            } catch (e) {}
            
            console.log('Inserting missing message for conv:', conv.id, 'body:', body);
            await supabase.from('messages').insert({
                conversation_id: conv.id,
                direction: 'inbound',
                content_type: 'text',
                body: body,
                status: 'delivered',
                created_at: conv.last_incoming_timestamp || conv.created_at
            });
            count++;
        }
    }
    console.log('Fixed', count, 'conversations.');
}
run();
