-- Petty cash bug fix (2/4): make petty-cash balance chaining atomic.
--
-- Bug: the transaction entry form computed balance_before/balance_after from a
-- stale/cached copy of the register balance instead of the live current_balance,
-- and it did not update the register in the same operation. Concurrent or
-- repeated saves therefore chained off a frozen balance and current_balance
-- stopped moving.
--
-- Fix: enforce the balance chain in a BEFORE INSERT trigger that reads the
-- register's current_balance FOR UPDATE (fresh + row-locked), derives the new
-- balances, and writes the register back in the same statement. This is
-- authoritative regardless of what the client sends, so the class of bug
-- cannot recur from the frontend.

CREATE OR REPLACE FUNCTION public.update_petty_cash_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_bal numeric(12,2);
BEGIN
  SELECT current_balance INTO current_bal
  FROM petty_cash_registers
  WHERE id = NEW.register_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Petty cash register % not found', NEW.register_id;
  END IF;

  NEW.balance_before := current_bal;

  IF NEW.transaction_type = 'expense' THEN
    NEW.balance_after := current_bal - NEW.amount;
  ELSIF NEW.transaction_type = 'replenishment' THEN
    NEW.balance_after := current_bal + NEW.amount;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    NEW.balance_after := current_bal + NEW.amount;
  END IF;

  UPDATE petty_cash_registers
  SET current_balance = NEW.balance_after, updated_at = NOW()
  WHERE id = NEW.register_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_update_petty_cash_balance ON public.petty_cash_transactions;
CREATE TRIGGER trigger_update_petty_cash_balance
BEFORE INSERT ON public.petty_cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_petty_cash_balance();
