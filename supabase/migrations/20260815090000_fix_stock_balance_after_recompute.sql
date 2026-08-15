-- Fix corrupted stock_transactions.balance_after (chronological running balance)
--
-- Root cause: balance_after was written at insert time from an UNORDERED
-- SUM(quantity) of whatever rows existed at that moment (see useDispatches.ts,
-- useFinishedGoodsStock.ts, and the enforce_stock_before_dispatch trigger which
-- only inspects the latest-dated neighbour). Because entries are routinely keyed
-- in out of date order (backdated dispatches, backfilled production receipts,
-- month-end reconciliation adjustments), every balance_after after such a row
-- became wrong -- 3,043 of 7,470 rows across 92 products at time of writing.
--
-- Effect on reports: a monthly stock statement reads balance_after as the month's
-- "closing" balance, so e.g. Dusting Cap (101) April closing showed 766,159 while
-- the true chronological closing (== May opening, derived from the quantity ledger)
-- was 1,309,985.
--
-- This migration corrects the derived balance_after column ONLY. No `quantity`
-- value is touched, so actual on-hand stock is unchanged. A trigger keeps
-- balance_after correct going forward, even for backdated entries.

-- 1. Safety backup of current balances (reversible)
create table if not exists public.stock_transactions_balance_backup_20260815 as
select id, product_id, balance_after, now() as backed_up_at
from public.stock_transactions;

-- 1b. Drop the non-negative check on balance_after. The true chronological
--     running balance legitimately dips negative for 91 products (a dispatch
--     keyed with an earlier date than the production that supplies it). Negative
--     stock is already "allowed per system design" (see useDispatches.ts and the
--     enforce_stock_before_dispatch guard), so this constraint contradicted the
--     data model and prevented storing the correct balance. Re-add later if a
--     stricter policy is adopted.
alter table public.stock_transactions
  drop constraint if exists chk_balance_after_nonnegative;

-- 2. Recompute helper: rewrite one product's balance chain in (created_at, id) order
create or replace function public.recompute_stock_balance_chain(p_product_id uuid)
returns void
language sql
as $$
  update public.stock_transactions s
  set balance_after = c.run
  from (
    select id,
           sum(quantity) over (
             order by created_at, id
             rows between unbounded preceding and current row
           ) as run
    from public.stock_transactions
    where product_id = p_product_id
  ) c
  where s.id = c.id
    and s.balance_after is distinct from c.run;
$$;

-- 3. One-time backfill for every product (set-based; runs before the trigger exists)
with c as (
  select id,
         sum(quantity) over (
           partition by product_id
           order by created_at, id
           rows between unbounded preceding and current row
         ) as run
  from public.stock_transactions
)
update public.stock_transactions s
set balance_after = c.run
from c
where s.id = c.id
  and s.balance_after is distinct from c.run;

-- 4. Keep balance_after correct on every future insert/update/delete.
--    A whole-chain recompute is required because a backdated row shifts the
--    running balance of every row after it -- inspecting a single neighbour
--    (as the old code did) can never stay consistent.
create or replace function public.trg_recompute_stock_balance()
returns trigger
language plpgsql
as $$
begin
  -- The recompute UPDATEs below re-enter this trigger; only act on the
  -- outermost (user-initiated) change to avoid infinite recursion.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.recompute_stock_balance_chain(old.product_id);
    return old;
  end if;

  perform public.recompute_stock_balance_chain(new.product_id);
  if tg_op = 'UPDATE' and new.product_id is distinct from old.product_id then
    perform public.recompute_stock_balance_chain(old.product_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recompute_stock_balance on public.stock_transactions;
create trigger trg_recompute_stock_balance
after insert or update or delete on public.stock_transactions
for each row execute function public.trg_recompute_stock_balance();
