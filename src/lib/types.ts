// ─── WhatsApp Number ───────────────────────────────────────
export interface WhatsAppNumber {
  id: string;
  number: string;       // e.g. "919999999999"
  label: string;        // e.g. "Sales", "Support"
  isDefault: boolean;
}

// ─── Contact ───────────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  createdAt: string;
}

// ─── Message ───────────────────────────────────────────────
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";
export type MessageContentType = "text" | "image" | "document" | "template";

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  contentType: MessageContentType;
  body: string; // text body or caption
  mediaUrl?: string; // for image/document
  fileName?: string; // for document
  status: MessageStatus;
  isInternalNote: boolean;
  timestamp: string;
}

// ─── Conversation ──────────────────────────────────────────
export type ConversationStatus = "open" | "resolved";

export interface Conversation {
  id: string;
  contactId: string;
  contact: Contact;
  integratedNumber: string; // which WA number this conversation belongs to
  status: ConversationStatus;
  lastMessage?: string;
  lastMessageTime: string;
  lastIncomingTimestamp: string;
  unreadCount: number;
  messages: Message[];
}

// ─── Template ──────────────────────────────────────────────
export interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
}

export interface Template {
  id: string;
  name: string;
  status: string;
  language: string;
  category: string;
  components: TemplateComponent[];
}

// ─── Broadcast ─────────────────────────────────────────────
export interface BroadcastCampaign {
  templateName: string;
  templateLanguage: string;
  variables: Record<string, string>;
  recipients: string[];
}

// ─── Payment ───────────────────────────────────────────────
export type PaymentStatus = "created" | "paid" | "unpaid" | "cancelled" | "expired";

export interface Payment {
  id: string;
  contactId?: string;
  conversationId?: string;
  contactName: string;
  phone: string;
  amount: number;
  currency: string;
  description?: string;
  razorpayLinkId?: string;
  razorpayPaymentId?: string;
  shortUrl?: string;
  messageStatus: string;
  paymentStatus: PaymentStatus;
  createdBy: string;
  integratedNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  created: { count: number; total: number };
  paid: { count: number; total: number };
  unpaid: { count: number; total: number };
  cancelled: { count: number; total: number };
}

export interface CreatePaymentPayload {
  contactName: string;
  phone: string;
  amount: number;
  description?: string;
  contactId?: string;
  conversationId?: string;
  integratedNumber?: string;
  sendViaWhatsApp?: boolean;
}

// ─── API Payloads ──────────────────────────────────────────
export interface SendTextPayload {
  to: string;
  contentType: "text";
  text: string;
  conversationId: string;
  integratedNumber: string;
}

export interface SendTemplatePayload {
  to: string;
  contentType: "template";
  templateName: string;
  templateLanguage: string;
  components: Record<string, { type: string; value: string }>;
  conversationId: string;
  integratedNumber: string;
}

export type SendMessagePayload = SendTextPayload | SendTemplatePayload;

// ─── Socket Events ─────────────────────────────────────────
export interface IncomingMessageEvent {
  conversationId: string;
  message: Message;
}

export interface StatusUpdateEvent {
  messageId: string;
  status: MessageStatus;
}
