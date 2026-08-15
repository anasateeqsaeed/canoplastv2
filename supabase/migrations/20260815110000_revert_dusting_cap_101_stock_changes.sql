-- Full revert of ALL Dusting Cap 101 stock-ledger changes back to the original
-- state (current on-hand 313,244), per owner request. This undoes migrations
-- 20260815090000 / 093000 / 100000 in the live database.
--
-- Restores balance_after from the pre-change snapshot
-- (stock_transactions_balance_backup_20260815), removes the inserted month-end
-- count rows, restores the April anchor, drops the recompute trigger/functions,
-- and restores the original non-negative check. The original check was NOT VALID
-- (617 pre-existing negative balance_after rows were grandfathered), so it is
-- restored the same way.

-- 1. Remove the auto-recompute trigger so the reversions below are literal
drop trigger if exists trg_recompute_stock_balance on public.stock_transactions;

-- 2. Delete the May/Jun/Jul physical-count rows that were inserted
delete from public.stock_transactions
where product_id='18853af0-fc73-4170-bff0-a808c7ad1c0d'
  and reference_type='production_adjustment'
  and remarks like '%(physical count)%';

-- 3. Restore the April anchor to its original delta / timestamp / remark
update public.stock_transactions
set quantity   = -151765,
    created_at = timestamptz '2026-04-30 23:59:59+00',
    remarks    = '[Apr 2026 closing] closing'
where product_id='18853af0-fc73-4170-bff0-a808c7ad1c0d'
  and reference_type='production_adjustment'
  and remarks like '%Apr 2026 closing%';

-- 4. Restore every row's original balance_after from the pre-change snapshot
update public.stock_transactions s
set balance_after = b.balance_after
from public.stock_transactions_balance_backup_20260815 b
where s.id = b.id
  and s.balance_after is distinct from b.balance_after;

-- 5. Drop the recompute functions added earlier
drop function if exists public.trg_recompute_stock_balance();
drop function if exists public.recompute_stock_balance_chain(uuid);

-- 6. Restore the original non-negative check constraint (NOT VALID, as it was)
alter table public.stock_transactions
  add constraint chk_balance_after_nonnegative check (balance_after >= 0) not valid;
