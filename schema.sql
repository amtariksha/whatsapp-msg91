-- ══════════════════════════════════════════════════════════════
-- WhatsApp CRM – Full Database Schema (Supabase / PostgreSQL)
-- Run this in Supabase SQL Editor to create all tables.
-- ══════════════════════════════════════════════════════════════

-- ─── Organizations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name                TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    msg91_auth_key      TEXT,
    razorpay_key_id     TEXT,
    razorpay_key_secret TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Users (admin panel auth) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password        TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'agent'
        CHECK (role IN ('admin', 'agent')),
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Contacts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT,
    phone           TEXT NOT NULL,
    email           TEXT,
    tags            TEXT[] DEFAULT '{}',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT contacts_phone_org_unique UNIQUE (phone, organization_id)
);

-- ─── Conversations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id         UUID REFERENCES contacts(id) ON DELETE CASCADE,
    integrated_number  TEXT,
    status             TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved')),
    last_message       TEXT,
    last_message_at    TIMESTAMPTZ,
    unread_count       INTEGER DEFAULT 0,
    assigned_to        UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id    UUID REFERENCES conversations(id) ON DELETE CASCADE,
    direction          TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content_type       TEXT NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('text', 'image', 'video', 'document', 'audio', 'template', 'payment_link')),
    body               TEXT,
    media_url          TEXT,
    template_name      TEXT,
    msg91_message_id   TEXT,
    request_id         TEXT,
    status             TEXT DEFAULT 'sent',
    integrated_number  TEXT,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id          UUID REFERENCES contacts(id) ON DELETE SET NULL,
    conversation_id     UUID REFERENCES conversations(id) ON DELETE SET NULL,
    contact_name        TEXT NOT NULL,
    phone               TEXT NOT NULL,
    amount              NUMERIC(10,2) NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'INR',
    description         TEXT,
    razorpay_link_id    TEXT,
    razorpay_payment_id TEXT,
    short_url           TEXT,
    message_status      TEXT DEFAULT 'pending',
    payment_status      TEXT NOT NULL DEFAULT 'created'
        CHECK (payment_status IN ('created', 'paid', 'unpaid', 'cancelled', 'expired')),
    transaction_ref     TEXT,
    created_by          TEXT,
    integrated_number   TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reminders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    due_at          TIMESTAMPTZ NOT NULL,
    note            TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'dismissed', 'completed')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Quick Replies ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quick_replies (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    shortcut        TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Templates (local drafts) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS templates_local (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    category          TEXT NOT NULL DEFAULT 'MARKETING'
        CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    language          TEXT NOT NULL DEFAULT 'en',
    header_type       TEXT,
    header_content    TEXT,
    body              TEXT NOT NULL,
    footer            TEXT,
    buttons           JSONB,
    status            TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    msg91_template_id TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Integrated Numbers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrated_numbers (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    number               TEXT NOT NULL,
    label                TEXT,
    active               BOOLEAN DEFAULT true,
    provider             TEXT DEFAULT 'msg91' CHECK (provider IN ('msg91', 'meta')),
    meta_waba_id         TEXT,
    meta_phone_number_id TEXT,
    meta_access_token    TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT integrated_numbers_number_org_unique UNIQUE (number, organization_id)
);

-- ─── Migrations (add columns to existing tables) ─────────────
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_ref TEXT;

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_organization ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(phone);
CREATE INDEX IF NOT EXISTS idx_reminders_organization ON reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at);
CREATE INDEX IF NOT EXISTS idx_quick_replies_organization ON quick_replies(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_local_organization ON templates_local(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrated_numbers_organization ON integrated_numbers(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

-- ─── RLS (enable on all tables) ───────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrated_numbers ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for server-side)
-- Drop first to avoid "already exists" errors on re-run
DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access" ON organizations;
    DROP POLICY IF EXISTS "Service role full access" ON users;
    DROP POLICY IF EXISTS "Service role full access" ON contacts;
    DROP POLICY IF EXISTS "Service role full access" ON conversations;
    DROP POLICY IF EXISTS "Service role full access" ON messages;
    DROP POLICY IF EXISTS "Service role full access" ON payments;
    DROP POLICY IF EXISTS "Service role full access" ON reminders;
    DROP POLICY IF EXISTS "Service role full access" ON quick_replies;
    DROP POLICY IF EXISTS "Service role full access" ON templates_local;
    DROP POLICY IF EXISTS "Service role full access" ON integrated_numbers;
END $$;

CREATE POLICY "Service role full access" ON organizations FOR ALL USING (true);
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON contacts FOR ALL USING (true);
CREATE POLICY "Service role full access" ON conversations FOR ALL USING (true);
CREATE POLICY "Service role full access" ON messages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON payments FOR ALL USING (true);
CREATE POLICY "Service role full access" ON reminders FOR ALL USING (true);
CREATE POLICY "Service role full access" ON quick_replies FOR ALL USING (true);
CREATE POLICY "Service role full access" ON templates_local FOR ALL USING (true);
CREATE POLICY "Service role full access" ON integrated_numbers FOR ALL USING (true);
