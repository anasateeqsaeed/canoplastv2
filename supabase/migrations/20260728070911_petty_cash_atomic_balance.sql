-- Petty cash: make the running-balance computation atomic and race-free.
--
-- Root cause of the "frozen balance_before" bug (adeel patty cash register,
-- 2026-06-22 .. 2026-07-09): balances were derived from a stale/cached copy of
-- petty_cash_registers.current_balance at the client, and the register balance
-- was not being advanced per transaction, so every new row chained off the same
-- frozen value instead of the previous transaction's balance_after.
--
-- The BEFORE INSERT trigger below already derives balances server-side from the
-- live register balance (so any client-supplied balance_before/balance_after is
-- ignored). This migration hardens it against the remaining concurrency hole:
-- the previous version read current_balance with a plain SELECT and then issued
-- a separate UPDATE, so two transactions inserted at nearly the same time could
-- both read the same balance and produce a lost update. Taking a FOR UPDATE row
-- lock on the register serializes concurrent inserts on the same register, so
-- the read-modify-write happens atomically within one database transaction.

CREATE OR REPLACE FUNCTION public.update_petty_cash_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_bal numeric(12,2);
BEGIN
  -- Lock the register row for the duration of this transaction. Concurrent
  -- inserts on the same register block here until we commit, guaranteeing each
  -- one reads the balance left by the previous one.
  SELECT current_balance INTO current_bal
  FROM petty_cash_registers
  WHERE id = NEW.register_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Petty cash register % not found', NEW.register_id;
  END IF;

  -- Always derive balances from the freshly-read, locked register balance --
  -- never from any value the client sent -- so a stale/cached balance can never
  -- be persisted.
  NEW.balance_before := current_bal;

  IF NEW.transaction_type = 'expense' THEN
    NEW.balance_after := current_bal - NEW.amount;
  ELSIF NEW.transaction_type = 'replenishment' THEN
    NEW.balance_after := current_bal + NEW.amount;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    -- For adjustments, amount is a signed delta applied to the balance.
    NEW.balance_after := current_bal + NEW.amount;
  END IF;

  -- Advance the register balance in the same transaction as the insert.
  UPDATE petty_cash_registers
  SET current_balance = NEW.balance_after, updated_at = NOW()
  WHERE id = NEW.register_id;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger is present and bound BEFORE INSERT (idempotent).
DROP TRIGGER IF EXISTS trigger_update_petty_cash_balance ON public.petty_cash_transactions;
CREATE TRIGGER trigger_update_petty_cash_balance
BEFORE INSERT ON public.petty_cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_petty_cash_balance();
