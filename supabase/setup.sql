-- Song Receipt Studio｜Supabase database setup
-- 請到 Supabase Dashboard → SQL Editor 貼上並執行

create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  remaining_credits integer not null default 10,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  amount integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  artist text not null,
  song text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;
alter table public.credit_logs enable row level security;
alter table public.receipts enable row level security;

drop policy if exists "Users can read own credits" on public.user_credits;
create policy "Users can read own credits"
on public.user_credits
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own credit logs" on public.credit_logs;
create policy "Users can read own credit logs"
on public.credit_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own receipts" on public.receipts;
create policy "Users can read own receipts"
on public.receipts
for select
to authenticated
using (auth.uid() = user_id);

-- 寫入與扣點由 Vercel 後端使用 SUPABASE_SERVICE_ROLE_KEY 完成。
-- service_role 會繞過 RLS，請不要把 SUPABASE_SERVICE_ROLE_KEY 放到前端。
