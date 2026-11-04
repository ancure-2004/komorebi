-- Komorebi (木漏れ日) Database Initialization Migration
-- Version: 0001_init.sql

create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── 1. Identity & Profiles ─────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('captain', 'her')),
  display_name text,
  updated_at timestamptz not null default now()
);

-- Helper security functions
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid()
  );
$$;

create or replace function public.is_captain()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'captain'
  );
$$;

create or replace function public.is_her()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'her'
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "members read profiles" on public.profiles;
create policy "members read profiles" on public.profiles
  for select to authenticated
  using (public.is_member());

drop policy if exists "captain manages profiles" on public.profiles;
create policy "captain manages profiles" on public.profiles
  for all to authenticated
  using (public.is_captain())
  with check (public.is_captain());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── 2. Sanctuary Messages (Ephemeral Chat) ──────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender uuid references auth.users(id) on delete cascade,
  text text,
  body text,
  type text not null default 'text' check (type in ('text', 'polaroid', 'voice')),
  kind text check (kind in ('text', 'polaroid', 'voice')),
  media_path text,
  mime text,
  consumed boolean not null default false,
  viewed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

-- Trigger to keep sender/sender_id, text/body, type/kind in sync
create or replace function public.sync_messages_columns()
returns trigger language plpgsql as $$
begin
  if new.sender is null and new.sender_id is not null then
    new.sender := new.sender_id;
  elsif new.sender_id is null and new.sender is not null then
    new.sender_id := new.sender;
  end if;

  if new.body is null and new.text is not null then
    new.body := new.text;
  elsif new.text is null and new.body is not null then
    new.text := new.body;
  end if;

  if new.kind is null and new.type is not null then
    new.kind := new.type;
  elsif new.type is null and new.kind is not null then
    new.type := new.kind;
  end if;

  if new.consumed is true and new.viewed_at is null then
    new.viewed_at := now();
  elsif new.viewed_at is not null and new.consumed is false then
    new.consumed := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_messages_columns on public.messages;
create trigger trg_sync_messages_columns
before insert or update on public.messages
for each row execute function public.sync_messages_columns();

alter table public.messages enable row level security;

drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages
  for select to authenticated
  using (public.is_member() and expires_at > now());

drop policy if exists "members insert messages" on public.messages;
create policy "members insert messages" on public.messages
  for insert to authenticated
  with check (public.is_member() and sender_id = auth.uid());

drop policy if exists "members update own messages" on public.messages;
create policy "members update own messages" on public.messages
  for update to authenticated
  using (public.is_member() and sender_id = auth.uid());

-- Compatibility view for chat_messages
create or replace view public.chat_messages as
  select
    id,
    sender_id as sender,
    sender_id,
    coalesce(text, body) as text,
    coalesce(body, text) as body,
    coalesce(type, kind) as type,
    coalesce(kind, type) as kind,
    media_path,
    mime,
    consumed,
    viewed_at,
    expires_at,
    created_at
  from public.messages;

-- ── 3. Daily Morning Notes & Polaroids ──────────────────────────
create table if not exists public.daily_notes (
  date date primary key,
  body text,
  caption text,
  polaroid_path text,
  updated_at timestamptz not null default now()
);

alter table public.daily_notes enable row level security;

drop policy if exists "members read notes" on public.daily_notes;
create policy "members read notes" on public.daily_notes
  for select to authenticated
  using (public.is_member());

drop policy if exists "captain writes notes" on public.daily_notes;
create policy "captain writes notes" on public.daily_notes
  for all to authenticated
  using (public.is_captain())
  with check (public.is_captain());

-- ── 4. Time-Locked Love Capsules ────────────────────────────────
create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note_text text,
  body text,
  photo_path text,
  media_path text,
  unlock_at timestamptz not null,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

-- Trigger to keep note_text/body, photo_path/media_path in sync
create or replace function public.sync_capsules_columns()
returns trigger language plpgsql as $$
begin
  if new.body is null and new.note_text is not null then
    new.body := new.note_text;
  elsif new.note_text is null and new.body is not null then
    new.note_text := new.body;
  end if;

  if new.media_path is null and new.photo_path is not null then
    new.media_path := new.photo_path;
  elsif new.photo_path is null and new.media_path is not null then
    new.photo_path := new.media_path;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_capsules_columns on public.capsules;
create trigger trg_sync_capsules_columns
before insert or update on public.capsules
for each row execute function public.sync_capsules_columns();

alter table public.capsules enable row level security;

drop policy if exists "captain manages capsules" on public.capsules;
create policy "captain manages capsules" on public.capsules
  for all to authenticated
  using (public.is_captain())
  with check (public.is_captain());

drop policy if exists "members read unlocked capsules" on public.capsules;
create policy "members read unlocked capsules" on public.capsules
  for select to authenticated
  using (public.is_member() and (public.is_captain() or unlock_at <= now()));

-- View for partner: strictly masks note_text/body and photo_path/media_path until unlock_at
create or replace view public.capsules_for_her as
  select
    id,
    title,
    unlock_at,
    opened_at,
    created_at,
    case when unlock_at <= now() then coalesce(note_text, body) end as note_text,
    case when unlock_at <= now() then coalesce(body, note_text) end as body,
    case when unlock_at <= now() then coalesce(photo_path, media_path) end as photo_path,
    case when unlock_at <= now() then coalesce(media_path, photo_path) end as media_path
  from public.capsules;

grant select on public.capsules_for_her to authenticated;

-- Function to mark capsule opened once unlocked
create or replace function public.open_capsule(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.capsules
  set opened_at = now()
  where id = p_id
    and unlock_at <= now()
    and opened_at is null
    and public.is_member();
$$;

grant execute on function public.open_capsule(uuid) to authenticated;

-- ── 5. Milestone Love Coupons ───────────────────────────────────
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  code text,
  emoji text default '🎟️',
  unlock_streak int default 1,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

drop policy if exists "members read coupons" on public.coupons;
create policy "members read coupons" on public.coupons
  for select to authenticated
  using (public.is_member());

drop policy if exists "captain writes coupons" on public.coupons;
create policy "captain writes coupons" on public.coupons
  for all to authenticated
  using (public.is_captain())
  with check (public.is_captain());

-- Function to redeem coupon
create or replace function public.redeem_coupon(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.coupons
  set redeemed_at = now()
  where id = p_id
    and redeemed_at is null
    and public.is_member();
$$;

grant execute on function public.redeem_coupon(uuid) to authenticated;

-- ── 6. Live Status & Telemetry ──────────────────────────────────
create table if not exists public.status (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  active_block text,
  label text,
  emoji text,
  pomodoro_active boolean default false,
  pomodoro boolean default false,
  last_seen timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to keep active_block/label, pomodoro_active/pomodoro, last_seen/updated_at synced
create or replace function public.sync_status_fields()
returns trigger language plpgsql as $$
begin
  if new.active_block is not null and new.label is null then
    new.label := new.active_block;
  elsif new.label is not null and new.active_block is null then
    new.active_block := new.label;
  end if;

  if new.pomodoro_active is not null and new.pomodoro is null then
    new.pomodoro := new.pomodoro_active;
  elsif new.pomodoro is not null and new.pomodoro_active is null then
    new.pomodoro_active := new.pomodoro;
  end if;

  if new.last_seen is not null and new.updated_at is null then
    new.updated_at := new.last_seen;
  elsif new.updated_at is not null and new.last_seen is null then
    new.last_seen := new.updated_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_status_fields on public.status;
create trigger trg_sync_status_fields
before insert or update on public.status
for each row execute function public.sync_status_fields();

alter table public.status enable row level security;

drop policy if exists "members read status" on public.status;
create policy "members read status" on public.status
  for select to authenticated
  using (public.is_member());

drop policy if exists "own status insert" on public.status;
create policy "own status insert" on public.status
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "own status update" on public.status;
create policy "own status update" on public.status
  for update to authenticated
  using (user_id = auth.uid());

-- ── 7. Ephemeral Storage Bucket & Daily Bucket ──────────────────
insert into storage.buckets (id, name, public)
values ('ephemeral', 'ephemeral', false), ('daily', 'daily', false)
on conflict (id) do update set public = false;

-- Ephemeral: members may upload only into their own folder (auth.uid()/...)
-- STRICT: NO SELECT policy for authenticated or anon.
-- Only Edge Functions using service_role key can download and delete from ephemeral.
drop policy if exists "ephemeral upload" on storage.objects;
create policy "ephemeral upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ephemeral'
    and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Daily bucket: members read (morning polaroids, capsule photos), captain writes
drop policy if exists "daily read" on storage.objects;
create policy "daily read" on storage.objects
  for select to authenticated
  using (bucket_id = 'daily' and public.is_member());

drop policy if exists "daily captain write" on storage.objects;
create policy "daily captain write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'daily' and public.is_captain());

drop policy if exists "daily captain update" on storage.objects;
create policy "daily captain update" on storage.objects
  for update to authenticated
  using (bucket_id = 'daily' and public.is_captain());

drop policy if exists "daily captain delete" on storage.objects;
create policy "daily captain delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'daily' and public.is_captain());

-- ── 8. Realtime Channel Authorization & Publications ────────────
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'realtime' and tablename = 'messages') then
    execute 'drop policy if exists "room read" on realtime.messages';
    execute 'create policy "room read" on realtime.messages for select to authenticated using (public.is_member())';
    execute 'drop policy if exists "room write" on realtime.messages';
    execute 'create policy "room write" on realtime.messages for insert to authenticated with check (public.is_member())';
  end if;
exception when others then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.status;
    alter publication supabase_realtime add table public.daily_notes;
  end if;
exception when others then null;
end $$;

-- ── 9. pg_cron Scheduled Cleanup (Midnight IST = 18:30 UTC) ─────
-- Deletes messages older than midnight IST
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('komorebi-midnight-cleanup')
      where exists (select 1 from cron.job where jobname = 'komorebi-midnight-cleanup');

    -- Schedule for 18:30 UTC every day (= 00:00 IST next day)
    perform cron.schedule(
      'komorebi-midnight-cleanup',
      '30 18 * * *',
      'delete from public.messages where created_at < (timezone(''Asia/Kolkata'', current_date)::timestamptz);'
    );
  end if;
exception when others then
  raise notice 'pg_cron cleanup schedule skipped or deferred: %', sqlerrm;
end $$;
