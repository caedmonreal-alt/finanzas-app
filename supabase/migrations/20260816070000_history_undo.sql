-- =====================================================================
-- Change history for transactions + "undo last action".
-- Every insert/update/delete on transactions is logged (before/after).
-- undo_last_batch() reverts the most recent batch (entries within 3 s of the last one)
-- without logging the reversal itself, and marks the entries as reverted.
-- Run AFTER 20260816060000_mi_pago.sql. Re-runnable.
-- =====================================================================
create table if not exists public.transaction_history (
  id bigserial primary key,
  user_id uuid not null,
  transaction_id uuid not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  before jsonb,
  after jsonb,
  created_at timestamptz not null default clock_timestamp(),
  reverted_at timestamptz
);
create index if not exists transaction_history_user_created_idx on public.transaction_history(user_id, created_at desc);
alter table public.transaction_history enable row level security;
drop policy if exists "history_select_own" on public.transaction_history;
create policy "history_select_own" on public.transaction_history for select using (auth.uid() = user_id);

create or replace function public.log_transaction_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.undoing', true), '') = '1' then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    insert into public.transaction_history (user_id, transaction_id, action, after) values (new.user_id, new.id, 'INSERT', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.transaction_history (user_id, transaction_id, action, before, after) values (new.user_id, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.transaction_history (user_id, transaction_id, action, before) values (old.user_id, old.id, 'DELETE', to_jsonb(old));
    return old;
  end if;
end $$;

drop trigger if exists transactions_history on public.transactions;
create trigger transactions_history
  after insert or update or delete on public.transactions
  for each row execute function public.log_transaction_change();

-- Describe the last undoable batch (for the button label)
create or replace function public.last_undo_batch()
returns table (batch_start timestamptz, entries int, actions text, sample text, total numeric)
language sql stable security invoker as $$
  with last as (
    select max(created_at) as t from public.transaction_history where user_id = auth.uid() and reverted_at is null
  ),
  b as (
    select h.* from public.transaction_history h, last
    where h.user_id = auth.uid() and h.reverted_at is null and h.created_at >= last.t - interval '3 seconds'
  )
  select min(created_at), count(*)::int,
         string_agg(distinct action, ','),
         (select coalesce((after->>'note'), (before->>'note')) from b order by created_at desc limit 1),
         sum(abs(coalesce((after->>'amount')::numeric, (before->>'amount')::numeric)))
  from b;
$$;

-- Revert the last batch. Returns number of entries reverted.
create or replace function public.undo_last_batch()
returns int language plpgsql security invoker as $$
declare r record; n int := 0; last_t timestamptz;
begin
  select max(created_at) into last_t from public.transaction_history where user_id = auth.uid() and reverted_at is null;
  if last_t is null then return 0; end if;
  perform set_config('app.undoing', '1', true);
  for r in
    select * from public.transaction_history
    where user_id = auth.uid() and reverted_at is null and created_at >= last_t - interval '3 seconds'
    order by created_at desc, id desc
  loop
    if r.action = 'INSERT' then
      delete from public.transactions where id = r.transaction_id and user_id = auth.uid();
    elsif r.action = 'UPDATE' then
      update public.transactions t set
        account_id = (r.before->>'account_id')::uuid,
        category_id = nullif(r.before->>'category_id','')::uuid,
        project_id = nullif(r.before->>'project_id','')::uuid,
        person_id = nullif(r.before->>'person_id','')::uuid,
        client_id = nullif(r.before->>'client_id','')::uuid,
        movement_type = (r.before->>'movement_type')::movement_type,
        amount = (r.before->>'amount')::numeric,
        date = (r.before->>'date')::date,
        note = r.before->>'note',
        tags = coalesce((select array_agg(x) from jsonb_array_elements_text(r.before->'tags') x), '{}'),
        is_recurring = coalesce((r.before->>'is_recurring')::boolean, false),
        transfer_account_id = nullif(r.before->>'transfer_account_id','')::uuid,
        split_group = nullif(r.before->>'split_group','')::uuid,
        is_fee = coalesce((r.before->>'is_fee')::boolean, false),
        covered_by_fee = nullif(r.before->>'covered_by_fee','')::uuid
      where t.id = r.transaction_id and t.user_id = auth.uid();
    else -- DELETE → re-insert
      insert into public.transactions (id, user_id, account_id, category_id, project_id, person_id, client_id, movement_type, amount, date, note, tags, is_recurring, transfer_account_id, split_group, is_fee, covered_by_fee, imported_hash, created_at)
      values (
        r.transaction_id, auth.uid(), (r.before->>'account_id')::uuid, nullif(r.before->>'category_id','')::uuid, nullif(r.before->>'project_id','')::uuid,
        nullif(r.before->>'person_id','')::uuid, nullif(r.before->>'client_id','')::uuid, (r.before->>'movement_type')::movement_type, (r.before->>'amount')::numeric,
        (r.before->>'date')::date, r.before->>'note', coalesce((select array_agg(x) from jsonb_array_elements_text(r.before->'tags') x), '{}'),
        coalesce((r.before->>'is_recurring')::boolean, false), nullif(r.before->>'transfer_account_id','')::uuid, nullif(r.before->>'split_group','')::uuid,
        coalesce((r.before->>'is_fee')::boolean, false), nullif(r.before->>'covered_by_fee','')::uuid, r.before->>'imported_hash', coalesce((r.before->>'created_at')::timestamptz, now())
      ) on conflict (id) do nothing;
    end if;
    update public.transaction_history set reverted_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
