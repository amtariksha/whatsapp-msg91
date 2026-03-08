-- broadcast_campaigns table for tracking broadcast history
CREATE TABLE broadcast_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'en',
  integrated_number TEXT,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sending',
  csv_file_name TEXT,
  msg91_response JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broadcast_campaigns_org ON broadcast_campaigns(organization_id);
CREATE INDEX idx_broadcast_campaigns_created ON broadcast_campaigns(created_at DESC);
ALTER TABLE broadcast_campaigns ENABLE ROW LEVEL SECURITY;

-- Add campaign_id to messages for future webhook stat tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES broadcast_campaigns(id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id) WHERE campaign_id IS NOT NULL;
