-- Backfill: correct balance_before / balance_after for the "adeel patty cash"
-- register (id = ba262855-8ec0-4a97-9a33-7d034609cc1d) for the window
-- 2026-06-22 .. 2026-07-09 (inclusive), which was corrupted by the frozen-balance
-- bug: every row in that window recorded balance_before = 1974 and computed
-- balance_after off that same frozen value instead of chaining from the previous
-- transaction.
--
-- Ordering: chronological by (transaction_date, created_at).
--
-- Starting balance: 974.00.
--   NOTE / RECONCILIATION: the last transaction *before* the window
--   (PCE-260620-017, 2026-06-20) recorded balance_after = 1974.00. Chaining the
--   window's recorded transactions (replenishments 248,260.00 - expenses
--   248,930.00 = net -670.00) from 1974 would end at 1304.00, but the register's
--   verified current_balance is 304.00 -- a difference of exactly 1000.00, the
--   register's float_amount. Starting the chain from 974.00 (= 1974 - 1000)
--   reconciles the window exactly to the trusted ending balance of 304.00 while
--   touching only balance columns on existing rows. The 1000.00 boundary
--   discrepancy is surfaced here deliberately and is NOT silently absorbed: if it
--   should instead be recorded as an explicit adjustment/cash-short entry, or if
--   the pre-window 1974 is the trusted figure, revert this migration (see backup
--   table below) and re-run with the chosen anchor.

BEGIN;

-- 1. Preserve the pre-backfill values for audit / rollback.
CREATE TABLE IF NOT EXISTS public.petty_cash_txn_balance_backfill_backup_20260728 (
  id uuid PRIMARY KEY,
  register_id uuid,
  transaction_number text,
  transaction_date date,
  created_at timestamptz,
  old_balance_before numeric,
  old_balance_after numeric,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.petty_cash_txn_balance_backfill_backup_20260728
  (id, register_id, transaction_number, transaction_date, created_at,
   old_balance_before, old_balance_after)
SELECT id, register_id, transaction_number, transaction_date, created_at,
       balance_before, balance_after
FROM public.petty_cash_transactions
WHERE register_id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
  AND transaction_date BETWEEN '2026-06-22' AND '2026-07-09'
ON CONFLICT (id) DO NOTHING;

-- 2. Recompute the running balance and rewrite balance_before / balance_after.
WITH ordered AS (
  SELECT
    id,
    CASE WHEN transaction_type = 'expense' THEN -amount ELSE amount END AS effect,
    row_number() OVER (ORDER BY transaction_date, created_at) AS rn
  FROM public.petty_cash_transactions
  WHERE register_id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
    AND transaction_date BETWEEN '2026-06-22' AND '2026-07-09'
),
running AS (
  SELECT
    id,
    effect,
    974.00 + COALESCE(
      SUM(effect) OVER (ORDER BY rn ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
      0
    ) AS bal_before
  FROM ordered
)
UPDATE public.petty_cash_transactions t
SET balance_before = r.bal_before,
    balance_after  = r.bal_before + r.effect,
    updated_at     = now()
FROM running r
WHERE t.id = r.id;

-- 3. Assert the chain closes exactly on the trusted current_balance (304.00).
--    Aborts the whole migration if it does not.
DO $$
DECLARE
  final_after numeric;
BEGIN
  SELECT balance_after INTO final_after
  FROM public.petty_cash_transactions
  WHERE register_id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
    AND transaction_date BETWEEN '2026-06-22' AND '2026-07-09'
  ORDER BY transaction_date DESC, created_at DESC
  LIMIT 1;

  IF final_after IS DISTINCT FROM 304.00 THEN
    RAISE EXCEPTION 'Backfill sanity check failed: window ends at % but expected 304.00', final_after;
  END IF;
END $$;

COMMIT;
