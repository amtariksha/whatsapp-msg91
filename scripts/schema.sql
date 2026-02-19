-- ============================================================
-- WhatsApp CRM — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Contacts
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- 2. Conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  integrated_number text not null,
  status text default 'open' check (status in ('open','resolved')),
  last_message text,
  last_message_time timestamptz default now(),
  last_incoming_timestamp timestamptz,
  unread_count int default 0,
  created_at timestamptz default now()
);

-- 3. Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  content_type text default 'text',
  body text,
  media_url text,
  file_name text,
  status text default 'sent',
  is_internal_note boolean default false,
  created_at timestamptz default now()
);

-- 4. Payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  contact_name text not null,
  phone text not null,
  amount decimal(10,2) not null,
  currency text default 'INR',
  description text,
  razorpay_link_id text,
  razorpay_payment_id text,
  short_url text,
  message_status text default 'pending',
  payment_status text default 'created' check (payment_status in ('created','paid','unpaid','cancelled','expired')),
  created_by text default 'Sales',
  integrated_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Users (auth)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text default 'agent' check (role in ('admin','agent')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── Indexes ───────────────────────────────────────────────
create index if not exists idx_conversations_contact on conversations(contact_id);
create index if not exists idx_conversations_status on conversations(status);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_messages_created on messages(created_at);
create index if not exists idx_payments_contact on payments(contact_id);
create index if not exists idx_payments_status on payments(payment_status);
create index if not exists idx_contacts_phone on contacts(phone);
create index if not exists idx_users_email on users(email);

-- ─── RLS ───────────────────────────────────────────────────
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table payments enable row level security;
alter table users enable row level security;

-- Allow all operations (single-tenant, service-role key bypasses RLS)
create policy "Allow all on contacts" on contacts for all using (true) with check (true);
create policy "Allow all on conversations" on conversations for all using (true) with check (true);
create policy "Allow all on messages" on messages for all using (true) with check (true);
create policy "Allow all on payments" on payments for all using (true) with check (true);
create policy "Allow all on users" on users for all using (true) with check (true);

