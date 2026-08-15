-- Anchor Dusting Cap (product code 101) month-end physical counts for
-- May / June / July 2026 (provided by the stock owner):
--   May 2026 closing = 706,159
--   Jun 2026 closing =  21,000
--   Jul 2026 closing = 156,669
-- (April 766,159 was anchored in 20260815093000.)
--
-- Each row forces that local month's closing to the counted figure. The delta is
-- count - (running balance just before the month-end in local time). Timestamps are
-- 23:59:59 Asia/Karachi (= 18:59:59 UTC) so each lands in the correct local month.
-- trg_recompute_stock_balance rewrites balance_after for the whole chain after each
-- insert; sequential inserts see each prior anchor.
--
-- NOTE: August (current) remains negative (-277,788) because August has dispatched
-- 936,000 against a July closing of 156,669 + 501,543 produced. That is an August
-- data issue (missing production or over-recorded dispatch), to be reconciled when
-- August closes / a current count is taken.

-- May 2026 -> 706,159
insert into public.stock_transactions
  (product_id, transaction_type, quantity, balance_after, reference_type, remarks, created_at)
select '18853af0-fc73-4170-bff0-a808c7ad1c0d', 'adjustment',
       706159 - coalesce((select sum(quantity) from public.stock_transactions
         where product_id='18853af0-fc73-4170-bff0-a808c7ad1c0d'
           and created_at < timestamptz '2026-05-31 18:59:59+00'),0),
       0, 'production_adjustment', '[May 2026 closing] closing (physical count)',
       timestamptz '2026-05-31 18:59:59+00';

-- June 2026 -> 21,000
insert into public.stock_transactions
  (product_id, transaction_type, quantity, balance_after, reference_type, remarks, created_at)
select '18853af0-fc73-4170-bff0-a808c7ad1c0d', 'adjustment',
       21000 - coalesce((select sum(quantity) from public.stock_transactions
         where product_id='18853af0-fc73-4170-bff0-a808c7ad1c0d'
           and created_at < timestamptz '2026-06-30 18:59:59+00'),0),
       0, 'production_adjustment', '[Jun 2026 closing] closing (physical count)',
       timestamptz '2026-06-30 18:59:59+00';

-- July 2026 -> 156,669
insert into public.stock_transactions
  (product_id, transaction_type, quantity, balance_after, reference_type, remarks, created_at)
select '18853af0-fc73-4170-bff0-a808c7ad1c0d', 'adjustment',
       156669 - coalesce((select sum(quantity) from public.stock_transactions
         where product_id='18853af0-fc73-4170-bff0-a808c7ad1c0d'
           and created_at < timestamptz '2026-07-31 18:59:59+00'),0),
       0, 'production_adjustment', '[Jul 2026 closing] closing (physical count)',
       timestamptz '2026-07-31 18:59:59+00';
