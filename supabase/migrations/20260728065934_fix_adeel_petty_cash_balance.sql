-- Petty cash bug fix (1/4): correct the "adeel patty cash" register balance.
--
-- The register's current_balance had drifted because the entry logic stopped
-- updating it (see 20260728072114_petty_cash_atomic_balance). Reset it to the
-- known-correct live value before the balance snapshots are recomputed.
--
-- Register: ba262855-8ec0-4a97-9a33-7d034609cc1d ("adeel patty cash")

update petty_cash_registers
set current_balance = 304.00,
    updated_at = now()
where id = 'ba262855-8ec0-4a97-9a33-7d034609cc1d';
