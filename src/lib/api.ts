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
    AppUser,
    QuickReply,
    Reminder,
    LocalTemplate,
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

export async function assignConversation(
    id: string,
    userId: string | null
): Promise<Conversation> {
    const res = await fetch(`${BASE_URL}/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: userId }),
    });
    if (!res.ok) throw new Error("Failed to assign conversation");
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

// ─── Users ─────────────────────────────────────────────────
export async function getUsers(): Promise<AppUser[]> {
    const res = await fetch(`${BASE_URL}/api/users`);
    if (!res.ok) throw new Error("Failed to fetch users");
    const data = await res.json();
    return data.map((u: Record<string, unknown>) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
    }));
}

// ─── Quick Replies ──────────────────────────────────────────
export async function getQuickReplies(): Promise<QuickReply[]> {
    const res = await fetch(`${BASE_URL}/api/quick-replies`);
    if (!res.ok) throw new Error("Failed to fetch quick replies");
    return res.json();
}

export async function createQuickReply(data: {
    title: string;
    body: string;
    shortcut?: string;
}): Promise<QuickReply> {
    const res = await fetch(`${BASE_URL}/api/quick-replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create quick reply");
    return res.json();
}

export async function updateQuickReply(
    id: string,
    data: { title?: string; body?: string; shortcut?: string }
): Promise<QuickReply> {
    const res = await fetch(`${BASE_URL}/api/quick-replies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update quick reply");
    return res.json();
}

export async function deleteQuickReply(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/quick-replies/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete quick reply");
}

// ─── Reminders ─────────────────────────────────────────────
export async function getReminders(): Promise<Reminder[]> {
    const res = await fetch(`${BASE_URL}/api/reminders`);
    if (!res.ok) throw new Error("Failed to fetch reminders");
    return res.json();
}

export async function createReminder(data: {
    conversationId: string;
    remindAt: string;
    note?: string;
}): Promise<Reminder> {
    const res = await fetch(`${BASE_URL}/api/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create reminder");
    return res.json();
}

export async function dismissReminder(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_dismissed: true }),
    });
    if (!res.ok) throw new Error("Failed to dismiss reminder");
}

export async function deleteReminder(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/reminders/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete reminder");
}

// ─── Local Templates ───────────────────────────────────────
export async function getLocalTemplates(): Promise<LocalTemplate[]> {
    const res = await fetch(`${BASE_URL}/api/templates/local`);
    if (!res.ok) throw new Error("Failed to fetch local templates");
    return res.json();
}

export async function createLocalTemplate(data: {
    name: string;
    category: string;
    language: string;
    headerText?: string;
    bodyText: string;
    footerText?: string;
    buttons?: Record<string, unknown>[];
}): Promise<LocalTemplate> {
    const res = await fetch(`${BASE_URL}/api/templates/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create template");
    return res.json();
}

export async function updateLocalTemplate(
    id: string,
    data: Record<string, unknown>
): Promise<LocalTemplate> {
    const res = await fetch(`${BASE_URL}/api/templates/local/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update template");
    return res.json();
}

export async function deleteLocalTemplate(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/templates/local/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete template");
}

export async function syncTemplates(): Promise<{ synced: number }> {
    const res = await fetch(`${BASE_URL}/api/templates/sync`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Failed to sync templates");
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

export async function updatePayment(
    id: string,
    payload: { paymentStatus?: string; transactionRef?: string }
): Promise<Payment> {
    const res = await fetch(`${BASE_URL}/api/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update payment");
    return res.json();
}
