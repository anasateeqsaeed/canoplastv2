# Canoplast v2 — Build Status

Rebuild of the Canoplast manufacturing ERP (v1 was Lovable-generated) with a new
double-entry Accounting module. Stack: Vite + React + TS + shadcn/ui + Tailwind + Supabase.

- **Branch**: `claude/app-feature-request-pj1uyh`
- **Supabase project**: `nreaslganhmdgmuewria` (canoplast-v2), region ap-south-1
- **Login**: username `admin` (email `admin@canoplast.local`) — change the password after first login
- **Fiscal year**: calendar year (Jan–Dec) · Currency: PKR
- **Env**: copy `.env.example` → `.env` (URL + publishable key; values in Supabase dashboard)

## Completed phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold, auth, 15-role RBAC (+accountant/finance_manager), layout shell, settings screens, base masters (departments, UOM, delivery/payment terms), edge functions (manage-user, change-password) | ✅ pushed |
| 1 | HR & Payroll: employees, work patterns, attendance + edit audit, shift rosters, leave (first-class, unlike v1), payroll runs/items, HR audit log. Advance auto-recovery deferred to Phase 6 | ✅ pushed |
| 2 | Purchase & Inventory (raw-material side): suppliers/clients/materials masters, POs → GRN → lot-tracked stock (`material_lots`), stores/racks, requisitions, material issue/return, gate movements, stock adjustment log, `next_doc_number` doc numbering | ✅ pushed |
| 3 | Sales: products master (costing fields + xlsx import), quotations → sales orders (tri-state progress triggers) → dispatch (QR challan, FG `stock_transactions` ledger) → invoices (dispatch-derived totals + corrections + `can_edit_invoice`). Trigger chain smoke-tested live | ✅ pushed |
| 4 | Accounting: double-entry GL — seeded 60-account CoA, calendar-year fiscal periods with locking, voucher engine (post/reverse, DB-level balance check, posted-voucher immutability), AR receipts + allocations, AP bills/payments + allocations, bank accounts + cheque register, 8 report functions, 8 UI screens. AR/AP flows smoke-tested live | ✅ pushed |

## Phase 4 — Accounting (built)

**Fiscal year = calendar year** (Jan–Dec, per the July 2026 plan doc). FY 2026 seeded with 12 monthly periods.

Schema (`chart_of_accounts`, `fiscal_years`, `accounting_periods`, `vouchers`, `voucher_lines`,
`ar_receipts` + allocations, `ap_bills`/`ap_bill_lines`, `ap_payments` + allocations, `bank_accounts`,
`accounting_doc_counters`, `cheque_register` view):
- **Voucher engine.** Everything — manual or auto — is a `vouchers` header + balanced `voucher_lines`.
  `post_voucher()` enforces ≥2 lines, debits = credits, non-zero, active non-group accounts, and an open
  period. Posted/reversed vouchers are immutable via triggers that only yield to the definer functions
  (`app.accounting_internal` flag); corrections go through `reverse_voucher()`, which writes a mirrored JV.
- **Subledgers without extra tables.** `voucher_lines.party_type`/`party_id` tag AR/AP control-account
  lines, so `party_ledger()` gives a per-customer/per-vendor statement — this replaces the
  `entity_account_map` table in the plan doc.
- **System accounts.** `chart_of_accounts.system_key` (`AR_CONTROL`, `AP_CONTROL`, `SALES_INCOME`,
  `GST_OUTPUT`, `CASH_IN_HAND`, `SALARY_EXPENSE`, …) is how posting functions find accounts; those rows
  can't be deleted or deactivated.
- **Numbering.** `next_voucher_number(type, date)` → `JV-2026-0001`, per type per calendar year. AR
  receipts, AP bills and AP payments share their document number with the voucher they post.
- **ERP → GL.** `post_sales_invoice_to_gl()` (Dr Trade Debtors / Cr Sales + GST Output) and
  `post_payroll_run()` (Dr Salary Expense / Cr Advances + Salaries Payable) exist and are invoked from
  the UI on demand — **not** yet wired as automatic triggers (deliberate: run them manually through the
  parallel-run month first, then flip to triggers).
- **Reports** (all SECURITY INVOKER, so RLS gates them): `trial_balance`, `profit_and_loss`,
  `balance_sheet`, `general_ledger`, `party_ledger`, `ar_aging`, `ap_aging`, plus the opening-balance
  helpers.
- **RLS** is stricter than other modules: `has_accounting_access()` = admin / accountant / finance_manager.
  Period locking is admin + finance_manager only.

UI at `/accounting`: dashboard (MTD income/expense, receivable, payable, cash & bank, recent vouchers),
chart of accounts (tree CRUD), journal entries (filters + draft/post/reverse), receivables (receipts with
FIFO auto-allocation, invoice GL posting, customer ledger, aging), payables (bills, payments, vendor
ledger, aging), bank & cheque register, financial reports (5 printable), fiscal periods.

### Not yet built (deferred from the plan doc)
- Bank reconciliation (statement upload/match) — `voucher_lines.is_reconciled`/`reconciled_on` columns
  are in place for it
- Credit notes (CN) / debit notes (DN) — voucher types are allowed, no UI yet
- Auto-posting triggers for GRN → stock, material issue → WIP, production → FG (needs the Phase 5
  inventory decision: periodic vs perpetual — plan recommends starting periodic)
- Analytics charts (Recharts) on the accounting dashboard; global deep search; saved filters
- Excel export (PDF is via browser print today)
- Opening-balance entry screen — use an `OB` voucher from Journal Entries meanwhile

## Remaining after that
- Phase 5: Production, Mixing, Tooling, Quality, Maintenance (largest v1 surface)
- Phase 6: Operational finance (petty cash, advances, investors, contractors, transport, electricity) posting into the GL via `_acc_create_posted_voucher`; reconnect payroll advance auto-recovery
- Phase 7: Report Centre + Executive/Ops/Operator dashboards
- Phase 8: i18n (en/ur), PWA polish, operator mobile views, RBAC audit, import tooling

## Conventions
- Migrations: applied via Supabase MCP, then exported to `supabase/migrations/` (source of truth = `supabase_migrations.schema_migrations`)
- `src/integrations/supabase/types.ts` is generated — regenerate after any schema change
- Not-yet-built table references are stripped with `// Reconnects in Phase N` comments — grep for `Reconnects in Phase` to find them
- Doc numbers via `next_doc_number(doc_type, prefix)`; RLS via `has_role(auth.uid(), '<role>')`
- Accounting doc numbers use `next_voucher_number(type, date)` instead; accounting RLS uses
  `has_accounting_access(auth.uid())`
- Never write to `vouchers`/`voucher_lines` after posting — go through `post_voucher()` /
  `reverse_voucher()`, or set `app.accounting_internal = 'on'` inside a SECURITY DEFINER function
