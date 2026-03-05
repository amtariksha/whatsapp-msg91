-- ══════════════════════════════════════════════════════════════
-- Migration: Add Organization-based Multi-Tenancy
-- Run this in Supabase SQL Editor to add organization support.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Create Organizations Table ──────────────────────────
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

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access" ON organizations;
END $$;
CREATE POLICY "Service role full access" ON organizations FOR ALL USING (true);

-- ─── 2. Create Default Organization for Existing Data ───────
INSERT INTO organizations (id, name, slug)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Default Organization', 'default')
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. Add organization_id to All Tables ───────────────────

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE users SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);

-- Contacts (change phone UNIQUE to composite)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE contacts SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE contacts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_key;
ALTER TABLE contacts ADD CONSTRAINT contacts_phone_org_unique UNIQUE (phone, organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization_id);

-- Conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE conversations SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE conversations ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations(organization_id);

-- Payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE payments SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE payments ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_organization ON payments(organization_id);

-- Quick Replies
ALTER TABLE quick_replies ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE quick_replies SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE quick_replies ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quick_replies_organization ON quick_replies(organization_id);

-- Templates (local drafts)
ALTER TABLE templates_local ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE templates_local SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE templates_local ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_local_organization ON templates_local(organization_id);

-- Integrated Numbers (change number UNIQUE to composite)
ALTER TABLE integrated_numbers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE integrated_numbers SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE integrated_numbers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE integrated_numbers DROP CONSTRAINT IF EXISTS integrated_numbers_number_key;
ALTER TABLE integrated_numbers ADD CONSTRAINT integrated_numbers_number_org_unique UNIQUE (number, organization_id);
CREATE INDEX IF NOT EXISTS idx_integrated_numbers_organization ON integrated_numbers(organization_id);

-- Reminders
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE reminders SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
ALTER TABLE reminders ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_organization ON reminders(organization_id);
