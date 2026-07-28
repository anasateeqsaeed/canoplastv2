-- Petty cash bug fix (4/4): full-history backfill for the "adeel patty cash" register.
--
-- Investigating the reported window (2026-06-22 .. 2026-07-09) revealed that the
-- balance corruption actually predated it: the ledger going back to the register's
-- first transaction (2026-02-04) contained broken chains and wrong-direction
-- replenishments. A first-principles recompute of all 1549 transactions from
-- opening_balance (0.00), in true chronological order, lands exactly on the live
-- current_balance of 304.00 -- confirming the transaction AMOUNTS are intact and
-- only the balance snapshot columns were wrong.
--
-- This migration recomputes balance_before/balance_after for the register's entire
-- history, resyncs current_balance, and asserts both the final balance (304.00) and
-- full chain/math consistency before committing. All prior balances are preserved in
-- petty_cash_txn_balance_fullbackfill_backup_20260728.
--
-- Register: ba262855-8ec0-4a97-9a33-7d034609cc1d ("adeel patty cash")

BEGIN;

-- 1. Full backup of every row's current balances for this register
CREATE TABLE IF NOT EXISTS public.petty_cash_txn_balance_fullbackfill_backup_20260728 (
  id uuid PRIMARY KEY,
  register_id uuid,
  transaction_number text,
  transaction_date date,
  created_at timestamptz,
  old_balance_before numeric,
  old_balance_after numeric,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.petty_cash_txn_balance_fullbackfill_backup_20260728
  (id, register_id, transaction_number, transaction_date, created_at,
   old_balance_before, old_balance_after)
SELECT id, register_id, transaction_number, transaction_date, created_at,
       balance_before, balance_after
FROM public.petty_cash_transactions
WHERE register_id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
ON CONFLICT (id) DO NOTHING;

-- 2. Recompute the running balance for ALL rows from opening_balance,
--    in true chronological order (transaction_date, created_at, id tiebreak).
WITH reg AS (
  SELECT COALESCE(opening_balance, 0)::numeric(12,2) AS opening
  FROM public.petty_cash_registers
  WHERE id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
),
ordered AS (
  SELECT
    id,
    CASE WHEN transaction_type = 'expense' THEN -amount ELSE amount END AS effect,
    row_number() OVER (ORDER BY transaction_date, created_at, id) AS rn
  FROM public.petty_cash_transactions
  WHERE register_id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
),
running AS (
  SELECT
    o.id,
    o.effect,
    (SELECT opening FROM reg)
      + COALESCE(SUM(o.effect) OVER (ORDER BY o.rn ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS bal_before
  FROM ordered o
)
UPDATE public.petty_cash_transactions t
SET balance_before = r.bal_before,
    balance_after  = r.bal_before + r.effect,
    updated_at     = now()
FROM running r
WHERE t.id = r.id;

-- 3. Resync the register's current_balance to the last computed balance
UPDATE public.petty_cash_registers reg
SET current_balance = sub.final_after, updated_at = now()
FROM (
  SELECT balance_after AS final_after
  FROM public.petty_cash_transactions
  WHERE register_id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
  ORDER BY transaction_date DESC, created_at DESC, id DESC
  LIMIT 1
) sub
WHERE reg.id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d';

-- 4. Sanity checks: end balance and full chain/math consistency
DO $$
DECLARE final_after numeric; bad_links integer; bad_math integer;
BEGIN
  SELECT balance_after INTO final_after
  FROM public.petty_cash_transactions
  WHERE register_id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
  ORDER BY transaction_date DESC, created_at DESC, id DESC LIMIT 1;

  IF final_after IS DISTINCT FROM 304.00 THEN
    RAISE EXCEPTION 'Full backfill failed: final balance is % but expected 304.00', final_after;
  END IF;

  WITH t AS (
    SELECT balance_before, balance_after, amount, transaction_type,
           lag(balance_after) OVER (ORDER BY transaction_date, created_at, id) AS prev_after
    FROM public.petty_cash_transactions
    WHERE register_id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d'
  )
  SELECT count(*) FILTER (WHERE prev_after IS NOT NULL AND prev_after <> balance_before),
         count(*) FILTER (WHERE (transaction_type='expense' AND balance_after <> balance_before - amount)
                             OR (transaction_type IN ('replenishment','adjustment') AND balance_after <> balance_before + amount))
    INTO bad_links, bad_math FROM t;

  IF bad_links <> 0 OR bad_math <> 0 THEN
    RAISE EXCEPTION 'Consistency check failed: % broken links, % math errors', bad_links, bad_math;
  END IF;
END $$;

COMMIT;
