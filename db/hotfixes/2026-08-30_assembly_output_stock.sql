-- =============================================================================
-- Hotfix: assembly production output was never posted to the finished-goods
--         stock ledger  ("production made but stock shows nil")
-- Applied live to Supabase project nreaslganhmdgmuewria on 2026-08-30.
-- =============================================================================
--
-- NOTE ON SCOPE
-- -------------
-- This file is a RECORD of a live-database hotfix. It lives outside
-- supabase/migrations/ on purpose: the production / assembly module (tables
-- assembly_production, production_jobs, assembly_inspection_lots, ...) is NOT
-- part of this repo's migration chain, so this must not run during a
-- `supabase db reset` of the Phase-3 schema. It is applied directly to the DB.
--
-- ROOT CAUSE
-- ----------
-- Finished-goods stock is derived from the stock_transactions ledger. Assembly
-- output is supposed to land there as 'assembly_output' inflows, but NO trigger
-- posted them. Historical rows were backfilled by hand once (up to 2026-06-19);
-- every assembly_production row entered after that never reached the ledger, so
-- those products read 0 (or went negative once they were dispatched anyway via
-- "Proceed Anyway"). 702-W "SPout CAp White" (job ASM-2026-6311, 45,000 pcs on
-- 2026-08-03) was one such case and is what surfaced the bug.
--
-- Effective good qty for an assembly row = assembled - rejection - hold - regrind.
--
-- =============================================================================
-- PART A — durable fix: auto-post future assembly output to the stock ledger
-- =============================================================================

create or replace function public.post_assembly_output_to_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_product_id uuid;
  v_qty integer;
  v_prev integer;
begin
  v_qty := greatest(0,
      coalesce(NEW.assembled_qty,0)
    - coalesce(NEW.rejection_qty,0)
    - coalesce(NEW.hold_qty,0)
    - coalesce(NEW.regrind_qty,0));
  if v_qty <= 0 then
    return NEW;
  end if;

  select coalesce(final_product_id, product_id) into v_product_id
  from public.production_jobs where id = NEW.job_id;
  if v_product_id is null then
    return NEW;  -- cannot attribute output to a product; skip
  end if;

  -- idempotency: never post the same assembly_production row twice
  if exists (
    select 1 from public.stock_transactions
    where transaction_type = 'assembly_output'
      and reference_type = 'assembly_production'
      and reference_id = NEW.id
  ) then
    return NEW;
  end if;

  -- authoritative current on-hand = latest ledger row's balance_after (locked),
  -- the same model used by enforce_stock_before_dispatch. The non-negative
  -- balance_after constraint therefore still applies: entries for a product whose
  -- ledger is currently negative are blocked until it is reconciled (stock take).
  select balance_after into v_prev
  from public.stock_transactions
  where product_id = v_product_id
  order by created_at desc, id desc
  for update
  limit 1;
  v_prev := coalesce(v_prev, 0);

  insert into public.stock_transactions(
    product_id, transaction_type, quantity, reference_type, reference_id,
    performed_by, balance_after, remarks)
  values (
    v_product_id, 'assembly_output', v_qty, 'assembly_production', NEW.id,
    auth.uid(), v_prev + v_qty,
    'Auto: assembly FG output (assembled - rejection - hold - regrind)');

  return NEW;
end;
$function$;

drop trigger if exists trg_post_assembly_output on public.assembly_production;
create trigger trg_post_assembly_output
after insert on public.assembly_production
for each row execute function public.post_assembly_output_to_stock();

-- =============================================================================
-- PART B — one-time backfill of missing historical assembly output
-- =============================================================================
--
-- Only products whose ledger stays >= 0 at EVERY posted row (the non-negative
-- balance_after constraint) were backfilled:
--
--   702-W  SPout CAp White      + 45,000     -> on hand 45,000   (was 0, no prior rows)
--   702-M  Spout Mespack Maroon + 1,233,000  -> on hand 1,128,000 (4 rows; big 2026-07-31
--                                               row lifts it positive, stays positive)
--
-- DEFERRED to a physical stock take (their ledger stays net-negative even after
-- adding the missing output, OR the honest chronological path dips below zero, so
-- the missing assembly output alone cannot make them correct):
--
--   701      Moskick New Dusting Cap   sum -128,300  (+100,000 -> -28,300)
--   702-O-   Spout Mespack Orange set  sum -529,500  (+24,000  -> -505,500)
--   703-Mar  Spout Bossar Maroon set   sum -522,000  (+171,000 -> -351,000)
--   703-O    Spout Bossar Orange set   sum -210,000  (+274,000 -> +64,000 final, but the
--                                                     first 2026-08-08 row lands at -35,000)
--   714      Tapper Cap Set 18mm       sum -158,400  (+118,529 -> -39,871)
--
-- These were dispatched (via "Proceed Anyway") for more than was produced-and-
-- posted; the balance_after chain on several has also diverged from sum(quantity).
-- The correct remedy is an opening-balance reset per product against a physical
-- count, not a blind inflow.
--
-- The backfill inserts were parameterised on live data (see reference_id =
-- assembly_production.id). Reproduced here for the record; guarded by NOT EXISTS
-- so re-running is safe.

-- 702-W (single row, job ASM-2026-6311 / assembly_production 21b3b9b2-...)
insert into public.stock_transactions
  (product_id, transaction_type, quantity, reference_type, reference_id, balance_after, remarks)
select 'c7c66705-4f64-45ef-ad9c-47fab62e86fd', 'assembly_output', 45000, 'assembly_production',
       '21b3b9b2-9f33-42d1-9bee-45b462fc751c', 45000,
       'Backfill: assembly FG output for job ASM-2026-6311 (45000 assembled) not previously posted to ledger'
where not exists (
  select 1 from public.stock_transactions
  where transaction_type='assembly_output' and reference_type='assembly_production'
    and reference_id='21b3b9b2-9f33-42d1-9bee-45b462fc751c');

-- 702-M (4 rows, ordered by production_date so balance_after never goes negative;
-- created_at staggered by 1ms so the latest ledger row reflects the full 1,128,000).
-- assembly_production ids, in order:
--   b030a83f-... 2026-07-31  +1,197,000  -> 1,092,000
--   0876746b-... 2026-08-17  +12,000     -> 1,104,000
--   5fcbf7a6-... 2026-08-17  +6,000      -> 1,110,000
--   b50875ce-... 2026-08-18  +18,000     -> 1,128,000
-- (Applied via an INSERT..SELECT with a running-balance window seeded from the
--  product's current sum(quantity) = -105,000.)
