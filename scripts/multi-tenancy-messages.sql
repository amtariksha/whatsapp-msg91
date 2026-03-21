-- ══════════════════════════════════════════════════════════════
-- Multi-tenancy: Add org_id to messages & reminders tables
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Add org_id to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- 2. Add org_id to reminders table (direct scoping, not just via user_id)
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- 3. Backfill messages org_id from their conversation's org_id
UPDATE messages m
SET org_id = c.org_id
FROM conversations c
WHERE m.conversation_id = c.id
  AND m.org_id = '00000000-0000-0000-0000-000000000001';

-- 4. Backfill reminders org_id from their user's org_id
UPDATE reminders r
SET org_id = u.org_id
FROM users u
WHERE r.user_id = u.id
  AND r.org_id = '00000000-0000-0000-0000-000000000001';

-- 5. Indexes for multi-tenancy lookups
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(org_id);
CREATE INDEX IF NOT EXISTS idx_reminders_org ON reminders(org_id);

-- 6. Add org_id column to organizations table for msg91_auth_key (if not exists)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS msg91_auth_key TEXT;
