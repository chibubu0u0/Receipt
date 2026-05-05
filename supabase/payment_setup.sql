-- Song Receipt Studio｜Payment architecture setup
-- 請到 Supabase Dashboard → SQL Editor 貼上並執行
-- 這份是付款架構資料表，接 TapPay / 綠界 / 藍新時會用到。

create table if not exists public.purchase_orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  credits integer not null,
  amount_twd integer not null,
  currency text not null default 'TWD',
  status text not null default 'pending',
  provider text,
  provider_order_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.purchase_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_transaction_id text,
  amount_twd integer not null,
  currency text not null default 'TWD',
  status text not null,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.purchase_orders enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Users can read own purchase orders" on public.purchase_orders;
create policy "Users can read own purchase orders"
on public.purchase_orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own payments" on public.payments;
create policy "Users can read own payments"
on public.payments
for select
to authenticated
using (auth.uid() = user_id);

create index if not exists purchase_orders_user_id_created_at_idx
on public.purchase_orders (user_id, created_at desc);

create index if not exists payments_user_id_created_at_idx
on public.payments (user_id, created_at desc);

create index if not exists payments_order_id_idx
on public.payments (order_id);

-- 寫入、付款確認、加點由 Vercel 後端使用 SUPABASE_SERVICE_ROLE_KEY 完成。
-- 下一步接金流時，可以在 webhook 中：
-- 1. 驗證金流簽章
-- 2. 找到 purchase_orders
-- 3. 寫入 payments
-- 4. 將 purchase_orders.status 改成 paid
-- 5. 增加 user_credits.remaining_credits
-- 6. 寫入 credit_logs
