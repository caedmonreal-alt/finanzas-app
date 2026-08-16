-- =====================================================================
-- Finanzas — initial schema
-- Run in Supabase SQL Editor (or `supabase db push`).
-- Every table has user_id + RLS so each user only sees their own rows.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type account_type as enum ('cash','debit','credit','investment','debt');
exception when duplicate_object then null; end $$;

do $$ begin
  create type category_kind as enum ('income','expense');
exception when duplicate_object then null; end $$;

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency text not null default 'MXN',
  created_at timestamptz not null default now()
);

-- ---------- accounts ----------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type account_type not null,
  currency text not null default 'MXN',
  opening_balance numeric(14,2) not null default 0,
  credit_limit numeric(14,2),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists accounts_user_idx on public.accounts(user_id);

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  color text,
  kind category_kind not null default 'expense',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_user_idx on public.categories(user_id);

-- ---------- transactions ----------
-- amount: negative = expense / outflow, positive = income / inflow.
-- transfer_account_id: when set, the row is a transfer to that account (neutral for net worth).
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14,2) not null,
  date date not null default current_date,
  note text,
  tags text[] not null default '{}',
  is_recurring boolean not null default false,
  transfer_account_id uuid references public.accounts(id) on delete set null,
  imported_hash text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_user_category_idx on public.transactions(user_id, category_id);
create index if not exists transactions_user_account_idx on public.transactions(user_id, account_id);
create unique index if not exists transactions_imported_hash_idx
  on public.transactions(user_id, imported_hash) where imported_hash is not null;

-- ---------- budgets ----------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null, -- first day of month
  amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);
create index if not exists budgets_user_month_idx on public.budgets(user_id, month);

-- ---------- snapshots (daily net worth for charts) ----------
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  net_worth numeric(14,2) not null,
  liquid numeric(14,2) not null default 0,
  invested numeric(14,2) not null default 0,
  debt numeric(14,2) not null default 0,
  unique (user_id, date)
);
create index if not exists snapshots_user_date_idx on public.snapshots(user_id, date);

-- ---------- goals (v2, created now so the model is ready) ----------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  target_date date,
  account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;
alter table public.snapshots    enable row level security;
alter table public.goals        enable row level security;

-- profiles: id = auth.uid()
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- generic "own rows" policies for user_id tables
do $$
declare t text;
begin
  foreach t in array array['accounts','categories','transactions','budgets','snapshots','goals'] loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s', t);
    execute format('create policy "%1$s_select_own" on public.%1$s for select using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s', t);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s', t);
    execute format('create policy "%1$s_update_own" on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s', t);
    execute format('create policy "%1$s_delete_own" on public.%1$s for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- =====================================================================
-- New user bootstrap: profile + default categories
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, icon, kind, sort_order) values
    (new.id, 'Nómina',          '💼', 'income',  1),
    (new.id, 'Freelance',       '🧾', 'income',  2),
    (new.id, 'Otros ingresos',  '➕', 'income',  3),
    (new.id, 'Vivienda',        '🏠', 'expense', 10),
    (new.id, 'Súper',           '🛒', 'expense', 11),
    (new.id, 'Restaurantes',    '🍽️', 'expense', 12),
    (new.id, 'Transporte',      '🚗', 'expense', 13),
    (new.id, 'Servicios',       '💡', 'expense', 14),
    (new.id, 'Salud',           '❤️', 'expense', 15),
    (new.id, 'Entretenimiento', '🎬', 'expense', 16),
    (new.id, 'Compras',         '🛍️', 'expense', 17),
    (new.id, 'Educación',       '📚', 'expense', 18),
    (new.id, 'Otros',           '•',  'expense', 99);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Views used by the dashboard (RLS applies through security_invoker)
-- =====================================================================

-- Current balance per account = opening + sum(own movements) + sum(transfers received)
create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.type,
  a.currency,
  a.credit_limit,
  a.opening_balance
    + coalesce((select sum(t.amount) from public.transactions t where t.account_id = a.id), 0)
    + coalesce((select sum(-t.amount) from public.transactions t where t.transfer_account_id = a.id), 0)
  as balance
from public.accounts a
where a.is_archived = false;

-- Monthly totals per category (expenses positive, income positive; transfers excluded)
create or replace view public.monthly_category_totals
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.date)::date as month,
  t.category_id,
  c.kind,
  sum(case when t.amount < 0 then -t.amount else t.amount end) as total,
  count(*) as tx_count
from public.transactions t
left join public.categories c on c.id = t.category_id
where t.transfer_account_id is null
group by t.user_id, date_trunc('month', t.date), t.category_id, c.kind;

-- Monthly income / expense / net
create or replace view public.monthly_totals
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.date)::date as month,
  sum(case when t.amount > 0 then t.amount else 0 end) as income,
  sum(case when t.amount < 0 then -t.amount else 0 end) as expense,
  sum(t.amount) as net
from public.transactions t
where t.transfer_account_id is null
group by t.user_id, date_trunc('month', t.date);
