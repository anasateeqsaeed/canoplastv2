-- Fix: production snapshot showed zero labour revenue for items whose labour
-- rate "did not update".
--
-- Root cause
-- ----------
-- The production snapshot values labour at the point-in-time rate returned by
-- public.get_product_price_on(product_id, production_date), which reads the
-- latest public.product_price_history row with effective_from <= the date.
-- Price history is written only by the app's rate-edit flow; there was no
-- database guarantee that a product with a master rate also has a covering
-- history row. 18 products carried a labour_price on the master but had no
-- price-history row at all (e.g. "Ar pocket comb" 195 w, "Cap Razor Twin cap"
-- 191-Twin cap), so the lookup returned NULL and labour revenue showed 0 even
-- though thousands of pcs were produced.
--
-- This migration does three things:
--   1. Backfills a baseline history row for every product that has a master
--      rate but no covering history (effective from the earliest of the
--      product's creation date and its first production date).
--   2. Hardens get_product_price_on to fall back to the product master's
--      current rate when no history row covers the date (never returns NULL
--      for a product that has a rate).
--   3. Adds a trigger so any create/change of selling_price / labour_price /
--      price_unit on products records a history row automatically.

-- 1) ---------------------------------------------------------------- backfill
INSERT INTO public.product_price_history
  (product_id, selling_price, labour_price, price_unit, effective_from, note)
SELECT pr.id,
       COALESCE(pr.selling_price, 0),
       COALESCE(pr.labour_price, 0),
       COALESCE(pr.price_unit, 'pcs'),
       d.eff,
       'Backfill 2026-07-30: baseline rate for pre-existing production (product had no covering price history)'
FROM public.products pr
CROSS JOIN LATERAL (
  SELECT least(
           pr.created_at::date,
           COALESCE((SELECT min(hp.production_date)
                     FROM public.hourly_production hp
                     JOIN public.production_jobs pj ON pj.id = hp.job_id
                     WHERE pj.product_id = pr.id), pr.created_at::date)
         ) AS eff
) d
WHERE COALESCE(pr.labour_price, 0) > 0
  AND (SELECT labour_price FROM public.get_product_price_on(pr.id, d.eff)) IS NULL
ON CONFLICT (product_id, effective_from) DO NOTHING;

-- 2) ------------------------------------------------ point-in-time safety net
CREATE OR REPLACE FUNCTION public.get_product_price_on(_product_id uuid, _on_date date)
 RETURNS TABLE(selling_price numeric, labour_price numeric, price_unit text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  (
    SELECT h.selling_price, h.labour_price, h.price_unit
    FROM public.product_price_history h
    WHERE h.product_id = _product_id
      AND h.effective_from <= _on_date
    ORDER BY h.effective_from DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT p.selling_price, p.labour_price, COALESCE(p.price_unit, 'pcs')
    FROM public.products p
    WHERE p.id = _product_id
      AND NOT EXISTS (
        SELECT 1 FROM public.product_price_history h2
        WHERE h2.product_id = _product_id
          AND h2.effective_from <= _on_date
      )
  )
$function$;

-- 3) --------------------------------------- auto-sync history from the master
CREATE OR REPLACE FUNCTION public.sync_product_price_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _should boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _should := COALESCE(NEW.labour_price, 0) <> 0 OR COALESCE(NEW.selling_price, 0) <> 0;
  ELSIF TG_OP = 'UPDATE' THEN
    _should := COALESCE(NEW.labour_price, 0)  IS DISTINCT FROM COALESCE(OLD.labour_price, 0)
            OR COALESCE(NEW.selling_price, 0) IS DISTINCT FROM COALESCE(OLD.selling_price, 0)
            OR COALESCE(NEW.price_unit, '')   IS DISTINCT FROM COALESCE(OLD.price_unit, '');
  END IF;

  IF _should THEN
    INSERT INTO public.product_price_history
      (product_id, selling_price, labour_price, price_unit, effective_from, note)
    VALUES
      (NEW.id,
       COALESCE(NEW.selling_price, 0),
       COALESCE(NEW.labour_price, 0),
       COALESCE(NEW.price_unit, 'pcs'),
       CASE WHEN TG_OP = 'INSERT' THEN COALESCE(NEW.created_at::date, current_date)
            ELSE current_date END,
       'Auto-synced from product master rate change')
    ON CONFLICT (product_id, effective_from)
    DO UPDATE SET selling_price = EXCLUDED.selling_price,
                  labour_price  = EXCLUDED.labour_price,
                  price_unit    = EXCLUDED.price_unit;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS products_sync_price_history ON public.products;
CREATE TRIGGER products_sync_price_history
  AFTER INSERT OR UPDATE OF selling_price, labour_price, price_unit ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_price_history();
