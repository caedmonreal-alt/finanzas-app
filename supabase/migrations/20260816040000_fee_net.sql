-- =====================================================================
-- "Mi pago" net of personal draws: personal expenses paid from the cash box
-- can be marked as covered by a fee split (so they are not deducted twice).
-- Run AFTER 20260816030000_fee_loans.sql. Re-runnable.
-- =====================================================================
alter table public.transactions add column if not exists covered_by_fee uuid;
create index if not exists transactions_covered_by_fee_idx on public.transactions(covered_by_fee) where covered_by_fee is not null;

-- Monthly ministraciones per client (explicit client_id or via project)
create or replace view public.monthly_client_received
with (security_invoker = true) as
select t.user_id, coalesce(t.client_id, p.client_id) as client_id, date_trunc('month', t.date)::date as month, sum(t.amount) as received
from public.transactions t
left join public.projects p on p.id = t.project_id
where t.movement_type = 'ministracion' and coalesce(t.client_id, p.client_id) is not null
group by t.user_id, coalesce(t.client_id, p.client_id), date_trunc('month', t.date);
