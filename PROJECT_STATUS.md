# Canoplast v2 — Build Status

Rebuild of the Canoplast manufacturing ERP (v1 was Lovable-generated) with a new
double-entry Accounting module. Stack: Vite + React + TS + shadcn/ui + Tailwind + Supabase.

- **Branch**: `claude/canoplast-v2-accounting-71w4yl`
- **Supabase project**: `nreaslganhmdgmuewria` (canoplast-v2), region ap-south-1
- **Login**: username `admin` (email `admin@canoplast.local`) — change the password after first login
- **Fiscal year**: July–June · Currency: PKR
- **Env**: copy `.env.example` → `.env` (URL + publishable key; values in Supabase dashboard)

## Completed phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold, auth, 15-role RBAC (+accountant/finance_manager), layout shell, settings screens, base masters (departments, UOM, delivery/payment terms), edge functions (manage-user, change-password) | ✅ pushed |
| 1 | HR & Payroll: employees, work patterns, attendance + edit audit, shift rosters, leave (first-class, unlike v1), payroll runs/items, HR audit log. Advance auto-recovery deferred to Phase 6 | ✅ pushed |
| 2 | Purchase & Inventory (raw-material side): suppliers/clients/materials masters, POs → GRN → lot-tracked stock (`material_lots`), stores/racks, requisitions, material issue/return, gate movements, stock adjustment log, `next_doc_number` doc numbering | ✅ pushed |
| 3 | Sales: products master (costing fields + xlsx import), quotations → sales orders (tri-state progress triggers) → dispatch (QR challan, FG `stock_transactions` ledger) → invoices (dispatch-derived totals + corrections + `can_edit_invoice`). Trigger chain smoke-tested live | ✅ pushed |

## Next: Phase 4 — Accounting (not started)

Full spec was drafted; short version:
- `chart_of_accounts` (seeded ~45-account Pakistani manufacturer CoA), `fiscal_years` + `accounting_periods` (FY 2026-27 seeded, July–June)
- `journal_entries`/`journal_entry_lines` with post/void functions, posted-entry immutability, period-close guard
- AR: `ar_receipts` + allocations → updates `sales_invoices.amount_paid/payment_status` (columns to add)
- AP: `ap_bills` (manual or from GRN/PO) + `ap_payments` + allocations
- `bank_accounts` (mapped to GL), `bank_reconciliations` (+items), `tax_codes` (GST/WHT seeds)
- Auto-posting triggers: invoice issued → Dr AR/Cr Revenue+Tax; payroll finalized → Dr Salaries/Cr Payable+Advances; paid → Cr Cash/Bank
- Report SQL functions: trial_balance, profit_and_loss, balance_sheet, general_ledger, ar_aging, ap_aging
- RLS stricter than other modules: accounting tables visible only to admin/accountant/finance_manager
- UI: dashboard, CoA, journal entries, receivables, payables, bank accounts + reconciliation, 6 printable reports, tax codes, fiscal periods

## Remaining after that
- Phase 5: Production, Mixing, Tooling, Quality, Maintenance (largest v1 surface)
- Phase 6: Operational finance (petty cash, advances, investors, contractors, transport, electricity) posting into the GL; reconnect payroll advance auto-recovery
- Phase 7: Report Centre + Executive/Ops/Operator dashboards
- Phase 8: i18n (en/ur), PWA polish, operator mobile views, RBAC audit, import tooling

## Conventions
- Migrations: applied via Supabase MCP, then exported to `supabase/migrations/` (source of truth = `supabase_migrations.schema_migrations`)
- `src/integrations/supabase/types.ts` is generated — regenerate after any schema change
- Not-yet-built table references are stripped with `// Reconnects in Phase N` comments — grep for `Reconnects in Phase` to find them
- Doc numbers via `next_doc_number(doc_type, prefix)`; RLS via `has_role(auth.uid(), '<role>')`
