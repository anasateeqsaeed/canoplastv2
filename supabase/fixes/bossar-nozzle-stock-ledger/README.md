# Bossar Nozzle stock-ledger fixes

Investigation of the "Bossar Nozzle shows negative stock / wrong production in
the Stock & Production Audit" report. The Production module runs on the live
Supabase project `nreaslganhmdgmuewria` (canoplast-v2) and is **not** in this
git repo, so these fixes are written as reviewable SQL to be applied via the
Supabase MCP / dashboard, not as app migrations.

## What was wrong (systemic, not one product)

- **43 products** show negative `component_stock`; **42** disagree with their ledger.
- **101 unsettled assembly reserves** (−4,441,200 units) still deducting stock.
- For Bossar Nozzle alone, four "stock" numbers all disagree:
  component_stock **−27,672** · ledger net **+131,837** · stored balance_after
  chain **+26,209** · audit "Actual" **3,823**.

Three root-cause bugs:

1. **Balance chain half-maintained + mis-ordered.** `enforce_stock_before_dispatch`
   set `balance_after` only for deduction rows and read the previous balance by
   `created_at` — which is back-dated on production receipts. 78/198 Bossar rows
   had a wrong `balance_after`; running balance dipped to −49,003.
2. **Reserves double-deduct and never release.** `assembly_reserve` deducts at
   dispatch, `assembly_issue` deducts again at the job, and
   `settle_assembly_reserves` only stamped `settled_at` without adding the
   quantity back. Includes one anomalous **−963,000** reserve.
3. **Four independent stock computations**, none reconciled; the audit "Out"
   column ignores assembly consumption entirely.

## What `01_non_destructive_stock_ledger_fixes.sql` does

Structural fixes only — **no existing rows are modified**:

- Adds `stock_transactions.seq` (monotonic ordering) + indexes.
- Replaces `enforce_stock_before_dispatch()` so `balance_after` is derived from
  the product's true net for **all** transaction types, serialised per product.
  New rows self-heal each product's latest balance without rewriting history.
- Replaces `settle_assembly_reserves()` so settling a reserve also posts an
  offsetting `assembly_reserve_release` (+) row — stops future double-counting.
- Adds read-only views `v_stock_reconciliation` (guardrail/diagnostic) and
  `v_stock_ledger_running` (correct running balance for the ledger-search UI).

## NOT in this file (Step 3 — destructive, needs your decisions)

Deferred until you confirm the business questions:

- Is the **−963,000** reserve real, or a data-entry error?
- What is the **physical on-hand count** of Bossar Nozzle today (anchor for the correction)?
- Should the **65 manual `ledger_reconciliation` adjustments** (+741,252) be kept or reversed?

Step 3 then: void/correct the bad reserve, release the 101 orphaned reserves,
recompute `balance_after` across all products, reset `component_stock`, and
reconcile to the physical count.

## Also flagged (security)

Three backup tables have **RLS disabled** (exposed to the anon key):
`stock_transactions_balance_backup_20260815`,
`petty_cash_txn_balance_backfill_backup_20260728`,
`petty_cash_txn_balance_fullbackfill_backup_20260728`. Lock down or drop.

## Status

Draft for review. Not applied to the live database.
