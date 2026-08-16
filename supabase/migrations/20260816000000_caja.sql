-- =====================================================================
-- Finanzas — v2 "Libro de caja"
-- Projects (obras / negocios / personal), people (caja chica, contratistas,
-- préstamos), movement types, petty-cash proofs, cash counts (arqueos).
-- Run AFTER 20260815000000_init.sql in the Supabase SQL Editor.
-- =====================================================================

-- ---------- enums ----------
do $$ begin create type project_kind as enum ('obra','negocio','personal','otro'); exception when duplicate_object then null; end $$;
do $$ begin create type project_status as enum ('presupuesto','proyecto','ejecucion','pausada','terminada'); exception when duplicate_object then null; end $$;
do $$ begin
  create type movement_type as enum (
    'gasto',            -- salida: compra o pago directo
    'caja_chica',       -- salida: entrega de efectivo a una persona que luego comprueba
    'pago',             -- salida: pago a persona (raya, contratista, proveedor)
    'prestamo',         -- salida: préstamo otorgado (me lo deben)
    'ministracion',     -- entrada: dinero del cliente de una obra
    'venta',            -- entrada: venta (ganado, etc.)
    'aportacion',       -- entrada: dinero propio que meto a la caja
    'cobro_prestamo',   -- entrada: me pagan un préstamo
    'otro_ingreso',     -- entrada: otros
    'transferencia',    -- movimiento entre cuentas propias (neutral)
    'ajuste'            -- ajuste por arqueo
  );
exception when duplicate_object then null; end $$;

-- ---------- projects ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind project_kind not null default 'obra',
  status project_status not null default 'ejecucion',
  color text,
  client_name text,
  contract_total numeric(14,2),      -- monto total pactado con el cliente
  installment_amount numeric(14,2),  -- tamaño típico de ministración
  budget_total numeric(14,2),        -- presupuesto de costo de la obra
  start_date date,
  notes text,
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects(user_id);

-- ---------- people ----------
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text,          -- encargado, contratista, proveedor, tercero…
  phone text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists people_user_idx on public.people(user_id);

-- ---------- transactions: new columns ----------
alter table public.transactions add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.transactions add column if not exists person_id uuid references public.people(id) on delete set null;
alter table public.transactions add column if not exists movement_type movement_type not null default 'gasto';
create index if not exists transactions_user_project_idx on public.transactions(user_id, project_id);
create index if not exists transactions_user_person_idx on public.transactions(user_id, person_id);

-- ---------- petty-cash proofs (comprobaciones; do NOT move cash) ----------
create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists proofs_user_person_idx on public.proofs(user_id, person_id);
create index if not exists proofs_user_project_idx on public.proofs(user_id, project_id);

-- ---------- cash counts (arqueos) ----------
create table if not exists public.cash_counts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null, -- null = todas las cuentas de efectivo
  date date not null default current_date,
  expected numeric(14,2) not null,
  counted numeric(14,2) not null,
  difference numeric(14,2) generated always as (counted - expected) stored,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists cash_counts_user_date_idx on public.cash_counts(user_id, date desc);

-- ---------- RLS ----------
alter table public.projects    enable row level security;
alter table public.people      enable row level security;
alter table public.proofs      enable row level security;
alter table public.cash_counts enable row level security;
do $$
declare t text;
begin
  foreach t in array array['projects','people','proofs','cash_counts'] loop
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
-- Functions
-- =====================================================================

-- Balance of ONE account at end of a date (opening + movements <= date, incl. transfers received)
create or replace function public.account_balance_at(p_account uuid, p_date date)
returns numeric language sql stable security invoker as $$
  select a.opening_balance
    + coalesce((select sum(t.amount) from public.transactions t where t.account_id = a.id and t.date <= p_date), 0)
    + coalesce((select sum(-t.amount) from public.transactions t where t.transfer_account_id = a.id and t.date <= p_date), 0)
  from public.accounts a where a.id = p_account
$$;

-- Cash on hand (all cash-type accounts of the caller) at end of a date
create or replace function public.cash_balance_at(p_date date)
returns numeric language sql stable security invoker as $$
  select coalesce(sum(public.account_balance_at(a.id, p_date)), 0)
  from public.accounts a
  where a.user_id = auth.uid() and a.type = 'cash' and a.is_archived = false
$$;

-- =====================================================================
-- Views
-- =====================================================================

-- Per project: received from client, spent (direct + petty-cash proofs), petty cash given, loans
create or replace view public.project_totals
with (security_invoker = true) as
select
  p.id as project_id,
  p.user_id,
  coalesce((select sum(t.amount) from public.transactions t where t.project_id = p.id and t.movement_type = 'ministracion'), 0) as received,
  coalesce((select sum(-t.amount) from public.transactions t where t.project_id = p.id and t.amount < 0 and t.movement_type in ('gasto','pago')), 0)
    + coalesce((select sum(pr.amount) from public.proofs pr where pr.project_id = p.id), 0) as spent,
  coalesce((select sum(-t.amount) from public.transactions t where t.project_id = p.id and t.movement_type = 'caja_chica'), 0) as petty_given,
  coalesce((select sum(t.amount) from public.transactions t where t.project_id = p.id and t.movement_type in ('venta','otro_ingreso')), 0) as sales,
  coalesce((select count(*) from public.transactions t where t.project_id = p.id), 0) as tx_count,
  (select max(t.date) from public.transactions t where t.project_id = p.id) as last_date
from public.projects p;

-- Per person: petty cash given / proved / pending, payments, loans outstanding
create or replace view public.person_balances
with (security_invoker = true) as
select
  pe.id as person_id,
  pe.user_id,
  coalesce((select sum(-t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'caja_chica'), 0) as petty_given,
  coalesce((select sum(pr.amount) from public.proofs pr where pr.person_id = pe.id), 0) as petty_proved,
  coalesce((select sum(-t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'pago'), 0) as payments,
  coalesce((select sum(-t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'prestamo'), 0)
    - coalesce((select sum(t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'cobro_prestamo'), 0) as loan_outstanding,
  greatest(
    (select max(t.date) from public.transactions t where t.person_id = pe.id),
    (select max(pr.date) from public.proofs pr where pr.person_id = pe.id)
  ) as last_date
from public.people pe;

-- Monthly totals per project (income/expense excluding transfers, loans and adjustments)
create or replace view public.monthly_project_totals
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.date)::date as month,
  t.project_id,
  sum(case when t.amount > 0 and t.movement_type not in ('cobro_prestamo','transferencia') then t.amount else 0 end) as income,
  sum(case when t.amount < 0 and t.movement_type not in ('prestamo','transferencia','caja_chica') then -t.amount else 0 end) as expense,
  sum(case when t.movement_type = 'caja_chica' then -t.amount else 0 end) as petty_given
from public.transactions t
where t.transfer_account_id is null
group by t.user_id, date_trunc('month', t.date), t.project_id;

-- Redefine monthly views so personal dashboards can exclude business movements
drop view if exists public.monthly_totals;
create view public.monthly_totals
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.date)::date as month,
  sum(case when t.amount > 0 then t.amount else 0 end) as income,
  sum(case when t.amount < 0 then -t.amount else 0 end) as expense,
  sum(t.amount) as net
from public.transactions t
left join public.projects p on p.id = t.project_id
where t.transfer_account_id is null
  and t.movement_type not in ('prestamo','cobro_prestamo','transferencia','ajuste')
  and (p.kind is null or p.kind = 'personal')
group by t.user_id, date_trunc('month', t.date);

drop view if exists public.monthly_category_totals;
create view public.monthly_category_totals
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
left join public.projects p on p.id = t.project_id
where t.transfer_account_id is null
  and t.movement_type not in ('prestamo','cobro_prestamo','transferencia','ajuste')
  and (p.kind is null or p.kind = 'personal')
group by t.user_id, date_trunc('month', t.date), t.category_id, c.kind;

-- =====================================================================
-- Seed for existing users: project catalogue, Personal/Rancho/Ganado, cash account
-- (safe to re-run: skips what already exists)
-- =====================================================================
do $$
declare u record; i int;
begin
  for u in select id from public.profiles loop
    -- projects (obras)
    i := 0;
    insert into public.projects (user_id, name, kind, status, sort_order)
    select u.id, x.name, 'obra'::project_kind, x.status::project_status, x.ord from (values
      ('Ampliación 01','ejecucion',1),('Ampliación 02','ejecucion',2),('Ampliación 03','presupuesto',3),
      ('Silo para granos','ejecucion',4),('Secadora de chile','ejecucion',5),('Casa magisterial','ejecucion',6),
      ('Bodega apicultura','ejecucion',7),('Caseta de seguridad','ejecucion',8),('Carnicería','ejecucion',9),
      ('Plaza comercial','proyecto',10),('Capilla','ejecucion',11),('Corrales de engorda','ejecucion',12)
    ) as x(name,status,ord)
    where not exists (select 1 from public.projects p where p.user_id = u.id and p.name = x.name);

    insert into public.projects (user_id, name, kind, status, sort_order)
    select u.id, x.name, x.kind::project_kind, 'ejecucion', x.ord from (values
      ('Rancho','negocio',20),('Ganado','negocio',21),('Personal','personal',30)
    ) as x(name,kind,ord)
    where not exists (select 1 from public.projects p where p.user_id = u.id and p.name = x.name);

    -- cash account if none
    if not exists (select 1 from public.accounts a where a.user_id = u.id and a.type = 'cash') then
      insert into public.accounts (user_id, name, type, opening_balance) values (u.id, 'Caja (efectivo)', 'cash', 0);
    end if;
  end loop;
end $$;

-- Also seed for future users (extend the bootstrap trigger)
create or replace function public.handle_new_user_v2()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.projects (user_id, name, kind, status, sort_order) values
    (new.id, 'Personal', 'personal', 'ejecucion', 30);
  insert into public.accounts (user_id, name, type, opening_balance) values (new.id, 'Caja (efectivo)', 'cash', 0);
  return new;
end $$;
drop trigger if exists on_auth_user_created_v2 on auth.users;
create trigger on_auth_user_created_v2 after insert on auth.users for each row execute function public.handle_new_user_v2();

-- Existing personal transactions get the Personal project
update public.transactions t
set project_id = p.id
from public.projects p
where t.project_id is null and p.user_id = t.user_id and p.kind = 'personal';
