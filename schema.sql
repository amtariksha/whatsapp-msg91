-- ══════════════════════════════════════════════════════════════
-- WhatsApp CRM – Full Database Schema (Supabase / PostgreSQL)
-- Run this in Supabase SQL Editor to create all tables.
-- ══════════════════════════════════════════════════════════════

-- ─── Organizations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default org (idempotent)
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default')
ON CONFLICT (slug) DO NOTHING;

-- ─── Users (admin panel auth) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'agent'
        CHECK (role IN ('super_admin', 'admin', 'agent')),
    active     BOOLEAN NOT NULL DEFAULT true,
    org_id     UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Contacts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT,
    phone      TEXT UNIQUE NOT NULL,
    email      TEXT,
    tags       TEXT[] DEFAULT '{}',
    notes      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Conversations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
        CHECK (content_type IN ('text', 'image', 'video', 'document', 'audio', 'template', 'payment_link', 'interactive', 'location', 'contact', 'voice_call')),
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
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    shortcut   TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Templates (local drafts) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS templates_local (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- ─── App Settings (key-value config) ─────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings (idempotent)
INSERT INTO app_settings (key, value) VALUES
    ('payment_template_name', ''),
    ('contacts_page_size', '25'),
    ('payments_page_size', '20'),
    ('whatsapp_catalog_id', '')
ON CONFLICT (key) DO NOTHING;

-- ─── Integrated Numbers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrated_numbers (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number     TEXT UNIQUE NOT NULL,
    label      TEXT,
    active     BOOLEAN DEFAULT true,
    provider   TEXT DEFAULT 'msg91' CHECK (provider IN ('msg91', 'meta')),
    meta_waba_id TEXT,
    meta_phone_number_id TEXT,
    meta_access_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ─── CTWA Config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ctwa_config (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facebook_user_id  TEXT NOT NULL,
    facebook_name     TEXT,
    access_token      TEXT NOT NULL,
    ad_account_id     TEXT,
    ad_account_name   TEXT,
    dataset_id        TEXT,
    capi_enabled      BOOLEAN DEFAULT false,
    capi_lead_tag     TEXT DEFAULT 'lead',
    capi_purchase_tag TEXT DEFAULT 'purchase',
    connected_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CTWA Ads (synced from Meta) ────────────────────────────
CREATE TABLE IF NOT EXISTS ctwa_ads (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_account_id   TEXT NOT NULL,
    campaign_id     TEXT NOT NULL,
    campaign_name   TEXT,
    adset_id        TEXT,
    adset_name      TEXT,
    ad_id           TEXT,
    ad_name         TEXT,
    status          TEXT,
    objective       TEXT,
    impressions     BIGINT DEFAULT 0,
    clicks          BIGINT DEFAULT 0,
    spend           NUMERIC(12,2) DEFAULT 0,
    leads           INTEGER DEFAULT 0,
    synced_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ad_account_id, campaign_id)
);

-- ─── CTWA Logs (click-to-whatsapp conversation logs) ────────
CREATE TABLE IF NOT EXISTS ctwa_logs (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ctwa_clid       TEXT NOT NULL,
    conversation_id UUID REFERENCES conversations(id),
    contact_id      UUID REFERENCES contacts(id),
    source_id       TEXT,
    source_type     TEXT,
    source_url      TEXT,
    headline        TEXT,
    body            TEXT,
    media_type      TEXT,
    media_url       TEXT,
    ad_name         TEXT,
    campaign_name   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Migrations (add columns to existing tables) ─────────────
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_internal_note BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'webapp';
ALTER TABLE templates_local ADD COLUMN IF NOT EXISTS variable_samples JSONB DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ctwa_clid TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'organic';

-- ─── Multi-tenancy: add org_id to all scoped tables ──────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE integrated_numbers ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE templates_local ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE ctwa_config ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE ctwa_logs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- Update role check to include super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'agent'));

-- Contacts: change phone uniqueness from global to per-org
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_org_phone ON contacts(org_id, phone);

-- Integrated numbers: allow same number in different orgs (unlikely but safe)
ALTER TABLE integrated_numbers DROP CONSTRAINT IF EXISTS integrated_numbers_number_key;

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(phone);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_ctwa ON conversations(ctwa_clid) WHERE ctwa_clid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ctwa_logs_conversation ON ctwa_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_logs_contact ON ctwa_logs(contact_id);

-- Multi-tenancy indexes
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_integrated_numbers_org ON integrated_numbers(org_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_org ON quick_replies(org_id);
CREATE INDEX IF NOT EXISTS idx_templates_local_org ON templates_local(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_ctwa_config_org ON ctwa_config(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(org_id);
CREATE INDEX IF NOT EXISTS idx_reminders_org ON reminders(org_id);

-- ─── Org-scoped app_settings ─────────────────────────────────
-- Add org_id to app_settings so each org can have its own settings.
-- Existing rows (org_id = NULL) are treated as global defaults.
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT NULL;
-- Backfill id for existing rows that may have NULL id
DO $$ BEGIN
    UPDATE app_settings SET id = gen_random_uuid() WHERE id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
-- Primary key on id (only if not already a PK)
DO $$ BEGIN
    ALTER TABLE app_settings ADD PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;
-- Unique: one setting per key per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_key_org ON app_settings(key, org_id) WHERE org_id IS NOT NULL;
-- Unique: one global setting per key (org_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_key_global ON app_settings(key) WHERE org_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_app_settings_org ON app_settings(org_id) WHERE org_id IS NOT NULL;

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
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctwa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctwa_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctwa_logs ENABLE ROW LEVEL SECURITY;

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
    DROP POLICY IF EXISTS "Service role full access" ON app_settings;
    DROP POLICY IF EXISTS "Service role full access" ON ctwa_config;
    DROP POLICY IF EXISTS "Service role full access" ON ctwa_ads;
    DROP POLICY IF EXISTS "Service role full access" ON ctwa_logs;
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
CREATE POLICY "Service role full access" ON app_settings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ctwa_config FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ctwa_ads FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ctwa_logs FOR ALL USING (true);
