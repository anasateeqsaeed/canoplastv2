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

## Order Readiness + Closure (frontend)
- Sales order detail: per-line stepper — Order steps 1–7 (`v_so_readiness_steps`) + Closure 8–12 (`v_so_closure_steps`), each step links to where it gets fixed
- Order list/detail: Order % · Closure % · Total % (`v_so_readiness`), red "blocked" badge, green "Ready to close" → `sales_orders.status='closed'`
- Delivery Confirmation (mobile-first) at `/inventory/dispatch/:id/confirm` → upserts `dispatch_delivery_confirmations`; DC list shows Received/QC/Bilty/Issue icons
- Settings → Readiness Weights (`so_readiness_weights` grouped by phase, warns when a phase ≠ 100)
- Dashboard tile "Closure pending"
- **Pending DB step** (not applied): `supabase/pending/delivery_closure_storage_realtime.sql` — `delivery-proofs` storage bucket for POD/bilty photos + adds `sales_invoices`, `dispatch_delivery_confirmations` etc. to the realtime publication

## BOM v2 (frontend)
- `product_bom_lines` is the only BOM the UI writes (DB trigger syncs legacy `product_materials`; `product_sets` no longer touched)
- Product Master → **BOM / Material List** tab: Molding (g/pc or per pc, waste %, grams vs weight ±5%, pigment %), Fitting parts (with each part's BOM status), Packing (per pack / per pc, pack size); 10,000-pc preview; Copy BOM from another product; templates (Injection item, PET bottle, Fitting set)
- **BOM Check** at `/masters/bom-check` (`v_product_bom_check`, active products) — deep-links to `/masters/products?bom=<id>`
- BOM status dot on the product list; readiness step 5 "Fitting parts", N/A steps greyed, per-step material/part needs with "via <part>"
- Pure helpers + tests in `src/lib/bom.ts` (`computeNeed` mirrors `v_product_bom.need_per_piece`)

## Order line Status Boxes (frontend)
- `get_so_line_boxes(_soi)` → Status Boxes drawer on the Sales Order page (click a line, or "Status boxes" on a readiness card): Mold · Machine · Raw Material · Pigment · Fitting parts (hidden if n/a) · Thaili/Carton · Production · Dispatch, with plan sentence and expandable details
- "Create PO" on shortfall rows → `/purchase/orders?new=1&material=<id>&qty=<n>&note=<text>` (PO dialog opens prefilled)
- Production → Machine Availability (`/production/machines`, `v_machine_availability`) and Mold Availability (`/production/molds`, `v_mold_availability`)
- `hours_per_day` (so_readiness_weights, phase `setting`) editable on Settings → Readiness Weights
