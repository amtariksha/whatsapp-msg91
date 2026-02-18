import { NextRequest, NextResponse } from "next/server";
import type { Conversation, Message, Contact } from "@/lib/types";

// ─── In-memory mock data store ─────────────────────────────
const mockContacts: Contact[] = [
    {
        id: "c1",
        name: "Rahul Sharma",
        phone: "919876543210",
        email: "rahul@example.com",
        tags: ["VIP", "Returning"],
        createdAt: "2025-12-01T10:00:00Z",
    },
    {
        id: "c2",
        name: "Priya Patel",
        phone: "919876543211",
        email: "priya@example.com",
        tags: ["New"],
        createdAt: "2026-01-15T08:30:00Z",
    },
    {
        id: "c3",
        name: "Amit Kumar",
        phone: "919876543212",
        email: "amit@example.com",
        tags: ["Support"],
        createdAt: "2026-02-01T14:00:00Z",
    },
    {
        id: "c4",
        name: "Sneha Reddy",
        phone: "919876543213",
        email: "sneha@example.com",
        tags: ["VIP"],
        createdAt: "2026-02-10T09:00:00Z",
    },
    {
        id: "c5",
        name: "Vikram Singh",
        phone: "919876543214",
        email: "vikram@example.com",
        tags: ["Returning"],
        createdAt: "2026-01-20T11:00:00Z",
    },
];

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();

function getDefaultIntegratedNumber(): string {
    const raw = process.env.MSG91_INTEGRATED_NUMBERS || "";
    const first = raw.split(",")[0] || "";
    return first.split(":")[0]?.trim() || "919999999999";
}

const mockMessages: Record<string, Message[]> = {
    conv1: [
        {
            id: "m1",
            conversationId: "conv1",
            direction: "inbound",
            contentType: "text",
            body: "Hey, I need help with my order #12345",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(2),
        },
        {
            id: "m2",
            conversationId: "conv1",
            direction: "outbound",
            contentType: "text",
            body: "Hi Rahul! Let me check your order status right away.",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(1.9),
        },
        {
            id: "m3",
            conversationId: "conv1",
            direction: "outbound",
            contentType: "text",
            body: "Your order #12345 is currently being packed and will be shipped tomorrow.",
            status: "delivered",
            isInternalNote: false,
            timestamp: hoursAgo(1.8),
        },
        {
            id: "m4",
            conversationId: "conv1",
            direction: "inbound",
            contentType: "text",
            body: "Great, thank you! Can you also update my delivery address?",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(1),
        },
        {
            id: "m5",
            conversationId: "conv1",
            direction: "outbound",
            contentType: "text",
            body: "Sure! Please share the new address and I'll update it for you.",
            status: "sent",
            isInternalNote: false,
            timestamp: minsAgo(30),
        },
    ],
    conv2: [
        {
            id: "m6",
            conversationId: "conv2",
            direction: "inbound",
            contentType: "text",
            body: "Hi, I'm interested in your premium plan",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(5),
        },
        {
            id: "m7",
            conversationId: "conv2",
            direction: "outbound",
            contentType: "text",
            body: "Hello Priya! Our premium plan starts at ₹999/month. Would you like more details?",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(4.5),
        },
        {
            id: "m8",
            conversationId: "conv2",
            direction: "inbound",
            contentType: "text",
            body: "Yes please, send me the brochure",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(3),
        },
    ],
    conv3: [
        {
            id: "m9",
            conversationId: "conv3",
            direction: "inbound",
            contentType: "text",
            body: "My product arrived damaged. Order #67890",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(48),
        },
        {
            id: "m10",
            conversationId: "conv3",
            direction: "outbound",
            contentType: "text",
            body: "We're sorry to hear that, Amit. We'll arrange a replacement immediately.",
            status: "delivered",
            isInternalNote: false,
            timestamp: hoursAgo(47),
        },
    ],
    conv4: [
        {
            id: "m11",
            conversationId: "conv4",
            direction: "inbound",
            contentType: "text",
            body: "When is the next sale event?",
            status: "read",
            isInternalNote: false,
            timestamp: minsAgo(10),
        },
    ],
    conv5: [
        {
            id: "m12",
            conversationId: "conv5",
            direction: "inbound",
            contentType: "text",
            body: "Can I get a refund for my cancelled order?",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(72),
        },
        {
            id: "m13",
            conversationId: "conv5",
            direction: "outbound",
            contentType: "text",
            body: "Your refund has been processed. It will reflect in 3-5 business days.",
            status: "read",
            isInternalNote: false,
            timestamp: hoursAgo(71),
        },
    ],
};

const mockConversations: Conversation[] = [
    {
        id: "conv1",
        contactId: "c1",
        contact: mockContacts[0],
        integratedNumber: getDefaultIntegratedNumber(),
        status: "open",
        lastMessage: "Sure! Please share the new address and I'll update it for you.",
        lastMessageTime: minsAgo(30),
        lastIncomingTimestamp: hoursAgo(1),
        unreadCount: 0,
        messages: mockMessages.conv1,
    },
    {
        id: "conv2",
        contactId: "c2",
        contact: mockContacts[1],
        integratedNumber: getDefaultIntegratedNumber(),
        status: "open",
        lastMessage: "Yes please, send me the brochure",
        lastMessageTime: hoursAgo(3),
        lastIncomingTimestamp: hoursAgo(3),
        unreadCount: 1,
        messages: mockMessages.conv2,
    },
    {
        id: "conv3",
        contactId: "c3",
        contact: mockContacts[2],
        integratedNumber: getDefaultIntegratedNumber(),
        status: "open",
        lastMessage: "We're sorry to hear that, Amit. We'll arrange a replacement immediately.",
        lastMessageTime: hoursAgo(47),
        lastIncomingTimestamp: hoursAgo(48), // Session expired (>24h)
        unreadCount: 0,
        messages: mockMessages.conv3,
    },
    {
        id: "conv4",
        contactId: "c4",
        contact: mockContacts[3],
        integratedNumber: getDefaultIntegratedNumber(),
        status: "open",
        lastMessage: "When is the next sale event?",
        lastMessageTime: minsAgo(10),
        lastIncomingTimestamp: minsAgo(10),
        unreadCount: 1,
        messages: mockMessages.conv4,
    },
    {
        id: "conv5",
        contactId: "c5",
        contact: mockContacts[4],
        integratedNumber: getDefaultIntegratedNumber(),
        status: "resolved",
        lastMessage: "Your refund has been processed. It will reflect in 3-5 business days.",
        lastMessageTime: hoursAgo(71),
        lastIncomingTimestamp: hoursAgo(72),
        unreadCount: 0,
        messages: mockMessages.conv5,
    },
];

// ─── GET /api/conversations ────────────────────────────────
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase();

    let filtered = [...mockConversations];

    if (status && status !== "all") {
        filtered = filtered.filter((c) => c.status === status);
    }

    if (search) {
        filtered = filtered.filter(
            (c) =>
                c.contact.name.toLowerCase().includes(search) ||
                c.contact.phone.includes(search)
        );
    }

    // Sort by lastMessageTime descending
    filtered.sort(
        (a, b) =>
            new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return NextResponse.json(filtered);
}

// ─── POST /api/conversations ───────────────────────────────
export async function POST(request: NextRequest) {
    const body = await request.json();
    const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        contactId: body.contactId,
        contact: mockContacts.find((c) => c.id === body.contactId) || mockContacts[0],
        integratedNumber: body.integratedNumber || getDefaultIntegratedNumber(),
        status: "open",
        lastMessage: "",
        lastMessageTime: new Date().toISOString(),
        lastIncomingTimestamp: new Date().toISOString(),
        unreadCount: 0,
        messages: [],
    };
    mockConversations.push(newConv);
    return NextResponse.json(newConv, { status: 201 });
}
