-- =====================================================================
-- v2.2: prorated fee ("Mi pago repartido"), two kinds of loans
-- (authorized by client → out of the client's fund; own → to workers),
-- yearly summary support. Run AFTER 20260816020000_clients.sql. Re-runnable.
-- =====================================================================
alter table public.transactions add column if not exists split_group uuid;
alter table public.transactions add column if not exists is_fee boolean not null default false;
create index if not exists transactions_split_group_idx on public.transactions(split_group) where split_group is not null;

-- Client fund: loans authorized by the client (explicit client_id on prestamo/cobro) are tracked apart
drop view if exists public.client_balances;
create view public.client_balances
with (security_invoker = true) as
with tx as (
  select t.*,
    case when t.movement_type in ('prestamo','cobro_prestamo') then t.client_id else coalesce(t.client_id, p.client_id) end as eff_client
  from public.transactions t
  left join public.projects p on p.id = t.project_id
),
pr as (
  select pr.*, pj.client_id as eff_client
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
  coalesce((select sum(-t.amount) from tx t where t.eff_client = c.id and t.movement_type = 'prestamo'), 0)
    - coalesce((select sum(t.amount) from tx t where t.eff_client = c.id and t.movement_type = 'cobro_prestamo'), 0) as loans_out,
  coalesce((select sum(-t.amount) from tx t where t.eff_client = c.id and t.is_fee), 0) as fees,
  (select max(t.date) from tx t where t.eff_client = c.id) as last_date
from public.clients c;

-- Person balances: split loans into client-authorized vs own
drop view if exists public.person_balances;
create view public.person_balances
with (security_invoker = true) as
select
  pe.id as person_id,
  pe.user_id,
  coalesce((select sum(-t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'caja_chica'), 0) as petty_given,
  coalesce((select sum(pr.amount) from public.proofs pr where pr.person_id = pe.id), 0) as petty_proved,
  coalesce((select sum(-t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'pago'), 0) as payments,
  coalesce((select sum(-t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'prestamo'), 0)
    - coalesce((select sum(t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'cobro_prestamo'), 0) as loan_outstanding,
  coalesce((select sum(-t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'prestamo' and t.client_id is not null), 0)
    - coalesce((select sum(t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'cobro_prestamo' and t.client_id is not null), 0) as loan_client_outstanding,
  coalesce((select sum(-t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'prestamo' and t.client_id is null), 0)
    - coalesce((select sum(t.amount) from public.transactions t where t.person_id = pe.id and t.movement_type = 'cobro_prestamo' and t.client_id is null), 0) as loan_own_outstanding,
  greatest(
    (select max(t.date) from public.transactions t where t.person_id = pe.id),
    (select max(pr.date) from public.proofs pr where pr.person_id = pe.id)
  ) as last_date
from public.people pe;

-- Yearly / monthly spend per project incl. proofs (comprobaciones count as project spend)
create or replace view public.monthly_project_spend
with (security_invoker = true) as
select user_id, project_id, month, sum(spent) as spent, sum(fees) as fees from (
  select t.user_id, t.project_id, date_trunc('month', t.date)::date as month,
         sum(case when t.amount < 0 and t.movement_type in ('gasto','pago') then -t.amount else 0 end) as spent,
         sum(case when t.is_fee then -t.amount else 0 end) as fees
  from public.transactions t
  where t.transfer_account_id is null and t.project_id is not null
  group by t.user_id, t.project_id, date_trunc('month', t.date)
  union all
  select pr.user_id, pr.project_id, date_trunc('month', pr.date)::date, sum(pr.amount), 0
  from public.proofs pr
  where pr.project_id is not null
  group by pr.user_id, pr.project_id, date_trunc('month', pr.date)
) x
group by user_id, project_id, month;
