import type {
    Conversation,
    Contact,
    Template,
    SendMessagePayload,
    Message,
    WhatsAppNumber,
    Payment,
    PaymentSummary,
    CreatePaymentPayload,
} from "./types";

const BASE_URL = "";

// ─── WhatsApp Numbers ──────────────────────────────────────
export async function getNumbers(): Promise<WhatsAppNumber[]> {
    const res = await fetch(`${BASE_URL}/api/numbers`);
    if (!res.ok) throw new Error("Failed to fetch numbers");
    return res.json();
}

// ─── Conversations ─────────────────────────────────────────
export async function getConversations(
    status?: string,
    search?: string
): Promise<Conversation[]> {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (search) params.set("search", search);
    const res = await fetch(`${BASE_URL}/api/conversations?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
}

export async function getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/api/conversations/${id}`);
    if (!res.ok) throw new Error("Failed to fetch conversation");
    return res.json();
}

export async function updateConversationStatus(
    id: string,
    status: string
): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update conversation");
    return res.json();
}

// ─── Messages ──────────────────────────────────────────────
export async function sendMessage(
    payload: SendMessagePayload
): Promise<Message> {
    const res = await fetch(`${BASE_URL}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
}

// ─── Contacts ──────────────────────────────────────────────
export async function getContacts(search?: string): Promise<Contact[]> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`${BASE_URL}/api/contacts?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch contacts");
    return res.json();
}

export async function getContact(id: string): Promise<Contact> {
    const res = await fetch(`${BASE_URL}/api/contacts/${id}`);
    if (!res.ok) throw new Error("Failed to fetch contact");
    return res.json();
}

export async function updateContactTags(
    id: string,
    tags: string[]
): Promise<Contact> {
    const res = await fetch(`${BASE_URL}/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
    });
    if (!res.ok) throw new Error("Failed to update contact");
    return res.json();
}

// ─── Templates ─────────────────────────────────────────────
export async function getTemplates(): Promise<Template[]> {
    const res = await fetch(`${BASE_URL}/api/templates`);
    if (!res.ok) throw new Error("Failed to fetch templates");
    return res.json();
}

// ─── Payments ──────────────────────────────────────────────
export async function getPayments(params?: {
    status?: string;
    from?: string;
    to?: string;
}): Promise<{ payments: Payment[]; summary: PaymentSummary }> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== "all")
        searchParams.set("status", params.status);
    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);
    const res = await fetch(
        `${BASE_URL}/api/payments?${searchParams.toString()}`
    );
    if (!res.ok) throw new Error("Failed to fetch payments");
    return res.json();
}

export async function createPayment(
    payload: CreatePaymentPayload
): Promise<Payment> {
    const res = await fetch(`${BASE_URL}/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create payment");
    return res.json();
}
