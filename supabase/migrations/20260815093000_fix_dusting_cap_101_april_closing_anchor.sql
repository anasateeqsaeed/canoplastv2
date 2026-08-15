-- April-only correction for Dusting Cap (product code 101).
--
-- The April 2026 month-end physical count (766,159) had two faults:
--  (a) timestamped 2026-04-30 23:59 UTC = 2026-05-01 04:59 Asia/Karachi, so it
--      fell into MAY in local-time reports (Product Activity), making it show as
--      May's opening instead of April's closing;
--  (b) its delta (-151,765) was computed against a buggy on-screen balance
--      (917,924) instead of the true balance (1,461,750), so the ledger never
--      actually reached the counted 766,159.
--
-- This re-times the row to the last day of April (local) and rewrites its delta
-- so April closing = 766,159 = May opening. trg_recompute_stock_balance then
-- propagates the chain. Downstream months (May-Aug) and current on-hand shift
-- down by 543,826 BY DESIGN, pending their own physical counts (the March count
-- and later months were intentionally left untouched per request).
with anchor as (
  select id
  from public.stock_transactions
  where product_id = '18853af0-fc73-4170-bff0-a808c7ad1c0d'
    and reference_type = 'production_adjustment'
    and remarks = '[Apr 2026 closing] closing'
),
prior as (
  select coalesce(sum(s.quantity), 0) as s
  from public.stock_transactions s
  where s.product_id = '18853af0-fc73-4170-bff0-a808c7ad1c0d'
    and s.created_at < timestamptz '2026-04-30 18:59:00+00'  -- 2026-04-30 23:59 Asia/Karachi
    and s.id <> (select id from anchor)
)
update public.stock_transactions t
set created_at = timestamptz '2026-04-30 18:59:00+00',
    quantity   = 766159 - (select s from prior),
    remarks    = '[Apr 2026 closing] closing (delta corrected to physical count 766,159; re-timed into April local time)'
where t.id = (select id from anchor);
