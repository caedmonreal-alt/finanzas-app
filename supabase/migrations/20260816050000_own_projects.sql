-- =====================================================================
-- Own projects whose expenses are deducted from "Mi pago" (Casa Alba I,
-- Casa magisterial), client Rancho Los Membrillos (Carnicería), Rancho → David.
-- Run AFTER 20260816040000_fee_net.sql. Re-runnable.
-- =====================================================================
alter table public.projects add column if not exists deduct_from_fee boolean not null default false;

do $$
declare u record; david uuid; rlm uuid;
begin
  for u in select id from public.profiles loop
    -- Personal-kind projects always deduct
    update public.projects set deduct_from_fee = true where user_id = u.id and kind = 'personal';
    -- Own obras: no client, deduct from fee
    update public.projects set client_id = null, deduct_from_fee = true
      where user_id = u.id and name in ('Casa Alba I','Casa magisterial');
    -- Client Rancho Los Membrillos → Carnicería
    insert into public.clients (user_id, name) values (u.id, 'Rancho Los Membrillos') on conflict (user_id, name) do nothing;
    select id into rlm from public.clients where user_id = u.id and name = 'Rancho Los Membrillos';
    update public.projects set client_id = rlm where user_id = u.id and name = 'Carnicería';
    -- Rancho (gastos rancho) belongs to David
    select id into david from public.clients where user_id = u.id and name = 'David';
    if david is not null then
      update public.projects set client_id = david where user_id = u.id and name = 'Rancho' and client_id is null;
    end if;
  end loop;
end $$;
