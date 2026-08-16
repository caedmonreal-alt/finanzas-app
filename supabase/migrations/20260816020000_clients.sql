-- =====================================================================
-- Clients with a pooled fund: ministraciones enter at the client level;
-- expenses are applied per project (obra) or directly to the client fund.
-- Run AFTER 20260816010000_people_seed.sql. Safe to re-run.
-- =====================================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists clients_user_idx on public.clients(user_id);
alter table public.clients enable row level security;
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients for select using (auth.uid() = user_id);
drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients for insert with check (auth.uid() = user_id);
drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients for delete using (auth.uid() = user_id);

alter table public.projects add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.transactions add column if not exists client_id uuid references public.clients(id) on delete set null;
create index if not exists transactions_user_client_idx on public.transactions(user_id, client_id);

-- Effective client of a transaction: explicit client_id, else the project's client
create or replace view public.client_balances
with (security_invoker = true) as
with tx as (
  select t.*, coalesce(t.client_id, p.client_id) as eff_client
  from public.transactions t
  left join public.projects p on p.id = t.project_id
),
pr as (
  select pr.*, coalesce(pj.client_id, null) as eff_client
  from public.proofs pr
  left join public.projects pj on pj.id = pr.project_id
)
select
  c.id as client_id,
  c.user_id,
  coalesce((select sum(t.amount) from tx t where t.eff_client = c.id and t.movement_type = 'ministracion'), 0) as received,
  coalesce((select sum(-t.amount) from tx t where t.eff_client = c.id and t.amount < 0 and t.movement_type in ('gasto','pago')), 0)
    + coalesce((select sum(pr.amount) from pr where pr.eff_client = c.id), 0) as applied,
  coalesce((select sum(-t.amount) from tx t where t.eff_client = c.id and t.movement_type = 'caja_chica'), 0)
    - coalesce((select sum(pr.amount) from pr where pr.eff_client = c.id), 0) as petty_pending,
  coalesce((select sum(-t.amount) from tx t where t.eff_client = c.id and t.amount < 0 and t.movement_type in ('gasto','pago') and t.project_id is null), 0) as applied_no_project,
  (select max(t.date) from tx t where t.eff_client = c.id) as last_date
from public.clients c;

-- Per (client, project) application, for the distribution table
create or replace view public.client_project_totals
with (security_invoker = true) as
select
  p.client_id,
  p.id as project_id,
  p.user_id,
  coalesce((select sum(-t.amount) from public.transactions t where t.project_id = p.id and t.amount < 0 and t.movement_type in ('gasto','pago')), 0)
    + coalesce((select sum(pr.amount) from public.proofs pr where pr.project_id = p.id), 0) as applied,
  coalesce((select sum(t.amount) from public.transactions t where t.project_id = p.id and t.movement_type = 'ministracion'), 0) as received_direct
from public.projects p
where p.client_id is not null;

-- Seed: main client "David" and attach every obra to him (re-runnable; renames "Cliente principal" if it exists)
do $$
declare u record; cid uuid;
begin
  for u in select id from public.profiles loop
    update public.clients set name = 'David' where user_id = u.id and name = 'Cliente principal'
      and not exists (select 1 from public.clients c2 where c2.user_id = u.id and c2.name = 'David');
    insert into public.clients (user_id, name) values (u.id, 'David')
    on conflict (user_id, name) do nothing;
    select id into cid from public.clients where user_id = u.id and name = 'David';
    update public.projects set client_id = cid where user_id = u.id and kind = 'obra' and client_id is null;
  end loop;
end $$;
