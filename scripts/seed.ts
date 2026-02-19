/**
 * Seed script for WhatsApp CRM demo data.
 *
 * Run this ONCE after creating the schema:
 *   npx tsx scripts/seed.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
 * (or SUPABASE_SERVICE_ROLE_KEY) in .env.local
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

const supabase = createClient(url, key, {
    auth: { persistSession: false },
});

async function seed() {
    console.log("🌱 Seeding demo data...\n");

    // 1. Contacts
    const contacts = [
        {
            name: "Rahul Sharma",
            phone: "919876543210",
            email: "rahul@example.com",
            tags: ["VIP", "Active"],
        },
        {
            name: "Priya Patel",
            phone: "919887654321",
            email: "priya@example.com",
            tags: ["New"],
        },
        {
            name: "Amit Kumar",
            phone: "919898765432",
            email: "amit@example.com",
            tags: ["Support"],
        },
        {
            name: "Sneha Gupta",
            phone: "919999876543",
            email: "sneha@example.com",
            tags: ["Active", "Delivery"],
        },
        {
            name: "Vikram Singh",
            phone: "919777654321",
            email: "vikram@example.com",
            tags: ["Inactive"],
        },
    ];

    const { data: insertedContacts, error: contactError } = await supabase
        .from("contacts")
        .upsert(contacts, { onConflict: "phone" })
        .select();

    if (contactError) {
        console.error("❌ Contact insert error:", contactError);
        return;
    }
    console.log(`✅ Inserted ${insertedContacts?.length} contacts`);

    // 2. Conversations
    const now = new Date();
    const conversations = insertedContacts!.map((c, i) => ({
        contact_id: c.id,
        integrated_number: i < 3 ? "919999999999" : "918888888888",
        status: i === 4 ? "resolved" : "open",
        last_message: [
            "Thanks for the quick delivery! 🙏",
            "Can you share the price list?",
            "I need to return my order",
            "When will my order arrive?",
            "Issue resolved, thank you!",
        ][i],
        last_message_time: new Date(
            now.getTime() - (i * 25 + 5) * 60 * 1000
        ).toISOString(),
        last_incoming_timestamp: new Date(
            now.getTime() - (i * 30 + 10) * 60 * 1000
        ).toISOString(),
        unread_count: [2, 1, 3, 0, 0][i],
    }));

    const { data: insertedConvs, error: convError } = await supabase
        .from("conversations")
        .insert(conversations)
        .select();

    if (convError) {
        console.error("❌ Conversation insert error:", convError);
        return;
    }
    console.log(`✅ Inserted ${insertedConvs?.length} conversations`);

    // 3. Messages for each conversation
    const allMessages: Array<{
        conversation_id: string;
        direction: string;
        content_type: string;
        body: string;
        status: string;
        is_internal_note: boolean;
        created_at: string;
    }> = [];

    insertedConvs!.forEach((conv, i) => {
        const baseTime = new Date(now.getTime() - (i * 60 + 120) * 60 * 1000);

        const threadMessages = [
            {
                dir: "inbound",
                body: ["Hi, I placed an order yesterday", "Hello! I want to know about your products", "I received a damaged product", "My order #12345 is delayed", "The issue with my account"][i],
            },
            {
                dir: "outbound",
                body: ["Hi! Let me check your order status. One moment please.", "Sure! Here's our latest catalog.", "Sorry to hear that. Please share a photo.", "Let me check the delivery status for you.", "We've fixed the issue. Is everything working now?"][i],
            },
            {
                dir: "inbound",
                body: ["Thanks for checking!", "The prices look great!", "Here's the photo of the damage", "Please update me soon", "Yes, all good now. Thanks!"][i],
            },
            {
                dir: "outbound",
                body: ["Your order is out for delivery! 🚚", "Would you like to place an order?", "We'll send a replacement right away.", "It will be delivered by tomorrow.", "Great! Feel free to reach out anytime."][i],
            },
            {
                dir: "inbound",
                body: ["Thanks for the quick delivery! 🙏", "Can you share the price list?", "I need to return my order", "When will my order arrive?", "Issue resolved, thank you!"][i],
            },
        ];

        threadMessages.forEach((msg, j) => {
            allMessages.push({
                conversation_id: conv.id,
                direction: msg.dir,
                content_type: "text",
                body: msg.body,
                status: msg.dir === "outbound" ? "delivered" : "sent",
                is_internal_note: false,
                created_at: new Date(
                    baseTime.getTime() + j * 15 * 60 * 1000
                ).toISOString(),
            });
        });
    });

    const { error: msgError } = await supabase
        .from("messages")
        .insert(allMessages);

    if (msgError) {
        console.error("❌ Message insert error:", msgError);
        return;
    }
    console.log(`✅ Inserted ${allMessages.length} messages`);

    // 4. Demo payments
    const payments = [
        {
            contact_id: insertedContacts![0].id,
            conversation_id: insertedConvs![0].id,
            contact_name: "Rahul Sharma",
            phone: "919876543210",
            amount: 1500.0,
            description: "Monthly subscription",
            payment_status: "paid",
            message_status: "sent",
            created_by: "Sales",
            integrated_number: "919999999999",
        },
        {
            contact_id: insertedContacts![1].id,
            conversation_id: insertedConvs![1].id,
            contact_name: "Priya Patel",
            phone: "919887654321",
            amount: 3200.0,
            description: "Product purchase",
            payment_status: "created",
            message_status: "sent",
            created_by: "Sales",
            integrated_number: "919999999999",
        },
        {
            contact_id: insertedContacts![3].id,
            conversation_id: insertedConvs![3].id,
            contact_name: "Sneha Gupta",
            phone: "919999876543",
            amount: 850.0,
            description: "Delivery charges",
            payment_status: "unpaid",
            message_status: "pending",
            created_by: "Support",
            integrated_number: "918888888888",
        },
    ];

    const { error: payError } = await supabase
        .from("payments")
        .insert(payments);

    if (payError) {
        console.error("❌ Payment insert error:", payError);
        return;
    }
    console.log(`✅ Inserted ${payments.length} demo payments`);

    console.log("\n🎉 Seed complete!");
}

seed().catch(console.error);
