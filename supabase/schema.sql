-- Run this entire file in the Supabase SQL editor (supabase.com → your project → SQL Editor)

-- Store Gmail OAuth tokens per user
create table if not exists gmail_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text not null,
  expiry_date bigint,
  created_at timestamptz default now()
);

-- Senders the user wants to monitor
create table if not exists senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  email text not null,
  label text,           -- friendly name e.g. "Cal Poly Housing"
  instructions text,    -- e.g. "I only care about deadlines and move-in info"
  created_at timestamptz default now(),
  unique(user_id, email)
);

-- Delivery schedule preference
create table if not exists digest_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  day_of_week int default 0,   -- 0=Sunday, 1=Monday ... 6=Saturday
  hour_utc int default 9,      -- hour in UTC to send
  created_at timestamptz default now()
);

-- Archive of sent digests
create table if not exists digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  sent_at timestamptz default now()
);

-- Row-level security: users can only see their own rows
alter table gmail_tokens enable row level security;
alter table senders enable row level security;
alter table digest_schedule enable row level security;
alter table digests enable row level security;

create policy "Users manage own gmail_tokens" on gmail_tokens for all using (auth.uid() = user_id);
create policy "Users manage own senders" on senders for all using (auth.uid() = user_id);
create policy "Users manage own digest_schedule" on digest_schedule for all using (auth.uid() = user_id);
create policy "Users see own digests" on digests for all using (auth.uid() = user_id);
