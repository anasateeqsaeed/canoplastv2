-- Petty cash bug fix (3/4): backfill the reported bug window.
--
-- Recompute balance_before/balance_after for the "adeel patty cash" register
-- over the reported window (2026-06-22 .. 2026-07-09), where every row had its
-- balance_before frozen at 1974. The window is chained in true chronological
-- order (transaction_date, then created_at) from the correct entering balance
-- of 974.00, and asserted to end at the live current_balance of 304.00.
--
-- Original values are preserved in petty_cash_txn_balance_backfill_backup_20260728.
--
-- NOTE: superseded by 20260728140541_petty_cash_full_history_backfill_adeel,
-- which found the corruption predated this window and recomputed the register's
-- entire history. Kept for audit history.

BEGIN;

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
