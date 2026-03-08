-- ═══════════════════════════════════════════════════════════════
-- Fix reminders table: add org_id column for multi-tenancy
-- Fix ctwa_ads table: add org_id column for multi-tenancy
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── Reminders: add org_id ──────────────────────────────────
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

-- Backfill org_id from the user's org_id for existing reminders
UPDATE reminders r
SET org_id = u.org_id
FROM users u
WHERE r.user_id = u.id
  AND (r.org_id IS NULL OR r.org_id = '00000000-0000-0000-0000-000000000001');

CREATE INDEX IF NOT EXISTS idx_reminders_org ON reminders(org_id);

-- ─── CTWA Ads: add org_id ───────────────────────────────────
ALTER TABLE ctwa_ads ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

-- Update unique constraint to be per-org
ALTER TABLE ctwa_ads DROP CONSTRAINT IF EXISTS ctwa_ads_ad_account_id_campaign_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ctwa_ads_org_account_campaign
    ON ctwa_ads(org_id, ad_account_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_ctwa_ads_org ON ctwa_ads(org_id);
