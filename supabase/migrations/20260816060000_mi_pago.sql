-- =====================================================================
-- "Mi pago": agreed monthly fee per client + monthly summary view
-- (fee registered, personal draws covered, uncovered draws).
-- Run AFTER 20260816050000_own_projects.sql. Re-runnable.
-- =====================================================================
alter table public.clients add column if not exists monthly_fee numeric(14,2);

create or replace view public.monthly_fee
with (security_invoker = true) as
select user_id, month, sum(fee) as fee, sum(covered) as covered, sum(uncovered) as uncovered
from (
  select t.user_id, date_trunc('month', t.date)::date as month,
         case when t.is_fee then -t.amount else 0 end as fee,
         case when t.split_group is not null and t.amount > 0 then t.amount else 0 end as covered,
         0::numeric as uncovered
  from public.transactions t
  where t.is_fee or (t.split_group is not null and t.amount > 0)
  union all
  select t.user_id, date_trunc('month', t.date)::date, 0, 0, -t.amount
  from public.transactions t
  join public.projects p on p.id = t.project_id
  join public.accounts a on a.id = t.account_id
  where p.deduct_from_fee and a.type = 'cash' and t.amount < 0
    and t.movement_type in ('gasto','pago') and t.covered_by_fee is null
) x
group by user_id, month;
