-- Electricity Consumption Dashboard — server-side aggregation functions.
-- Both run SECURITY INVOKER so the existing "authenticated can read" RLS on
-- electricity_readings / electricity_meters / hourly_production / machines applies.

-- 1) Daily grid vs solar vs total consumption for a date range.
--    Each meter's CT ratio (multiplier_factor / divisor_factor) is applied.
--    Solar is not separately metered on site: the "Internal Main (After KE+Solar)"
--    meter measures total load and "KE Main" measures the grid feed, so
--    self-generated (solar) = total load - grid, floored at 0. If a real solar
--    'production' meter reading exists it takes precedence.
DROP FUNCTION IF EXISTS public.electricity_daily_summary(date, date);

CREATE FUNCTION public.electricity_daily_summary(p_start date, p_end date)
RETURNS TABLE (
  reading_date date,
  grid_units numeric,
  solar_units numeric,
  total_units numeric,
  submeter_units numeric,
  internal_units numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH per_day AS (
    SELECT
      r.reading_date,
      COALESCE(SUM(
        GREATEST(COALESCE(r.units_consumed, 0), 0)
        * COALESCE(m.multiplier_factor, 1) / NULLIF(COALESCE(m.divisor_factor, 1), 0)
      ) FILTER (WHERE m.meter_type = 'ke_main'), 0)      AS grid,
      COALESCE(SUM(
        GREATEST(COALESCE(r.units_consumed, 0), 0)
        * COALESCE(m.multiplier_factor, 1) / NULLIF(COALESCE(m.divisor_factor, 1), 0)
      ) FILTER (WHERE m.meter_type = 'internal_main'), 0) AS internal,
      COALESCE(SUM(
        GREATEST(COALESCE(r.units_consumed, 0), 0)
        * COALESCE(m.multiplier_factor, 1) / NULLIF(COALESCE(m.divisor_factor, 1), 0)
      ) FILTER (WHERE m.meter_type = 'production'), 0)    AS solar_metered,
      COALESCE(SUM(
        GREATEST(COALESCE(r.units_consumed, 0), 0)
        * COALESCE(m.multiplier_factor, 1) / NULLIF(COALESCE(m.divisor_factor, 1), 0)
      ) FILTER (WHERE m.meter_type = 'consumption'), 0)   AS submeter
    FROM electricity_readings r
    JOIN electricity_meters m ON m.id = r.meter_id
    WHERE r.reading_date BETWEEN p_start AND p_end
    GROUP BY r.reading_date
  )
  SELECT
    reading_date,
    ROUND(grid, 1)                                                AS grid_units,
    ROUND(GREATEST(solar_metered, internal - grid, 0), 1)        AS solar_units,
    ROUND(grid + GREATEST(solar_metered, internal - grid, 0), 1) AS total_units,
    ROUND(submeter, 1)                                            AS submeter_units,
    ROUND(internal, 1)                                            AS internal_units
  FROM per_day
  ORDER BY reading_date;
$$;

-- 2) Per-machine estimated energy use + what was produced, for a date range.
--    Estimated units = machine assumed_power_kw x sum(hours_covered), because
--    per-entry energy is not sub-metered on the shop floor.
DROP FUNCTION IF EXISTS public.machine_energy_analysis(date, date);

CREATE FUNCTION public.machine_energy_analysis(p_start date, p_end date)
RETURNS TABLE (
  machine_id uuid,
  machine_code text,
  department text,
  power_kw numeric,
  run_hours numeric,
  est_units numeric,
  ok_qty bigint,
  reject_qty bigint,
  product_count bigint,
  top_products jsonb
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      hp.machine_id,
      m.machine_id                              AS machine_code,
      d.name                                    AS department,
      m.assumed_power_kw                        AS power_kw,
      COALESCE(hp.hours_covered, 0)             AS hours_covered,
      COALESCE(hp.ok_qty, 0)                    AS ok_qty,
      COALESCE(hp.rejection_qty, 0)             AS reject_qty,
      NULLIF(TRIM(COALESCE(p.name, pj.product_name, '')), '') AS product_name
    FROM hourly_production hp
    JOIN machines m              ON m.id = hp.machine_id
    LEFT JOIN departments d      ON d.id = m.department_id
    LEFT JOIN production_jobs pj ON pj.id = hp.job_id
    LEFT JOIN products p         ON p.id = pj.product_id
    WHERE hp.production_date BETWEEN p_start AND p_end
  ),
  by_product AS (
    SELECT machine_id, product_name,
           SUM(ok_qty) AS qty, SUM(hours_covered) AS hrs
    FROM base
    WHERE product_name IS NOT NULL
    GROUP BY machine_id, product_name
  )
  SELECT
    b.machine_id,
    MAX(b.machine_code)                                    AS machine_code,
    MAX(b.department)                                      AS department,
    MAX(b.power_kw)                                        AS power_kw,
    SUM(b.hours_covered)                                   AS run_hours,
    ROUND(COALESCE(MAX(b.power_kw), 0) * SUM(b.hours_covered), 1) AS est_units,
    SUM(b.ok_qty)::bigint                                  AS ok_qty,
    SUM(b.reject_qty)::bigint                              AS reject_qty,
    COUNT(DISTINCT b.product_name)                         AS product_count,
    COALESCE((
      SELECT jsonb_agg(x ORDER BY x.qty DESC)
      FROM (
        SELECT bp.product_name AS product, bp.qty, bp.hrs
        FROM by_product bp
        WHERE bp.machine_id = b.machine_id
        ORDER BY bp.qty DESC
        LIMIT 5
      ) x
    ), '[]'::jsonb)                                        AS top_products
  FROM base b
  GROUP BY b.machine_id
  HAVING SUM(b.hours_covered) > 0
  ORDER BY est_units DESC;
$$;

GRANT EXECUTE ON FUNCTION public.electricity_daily_summary(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.machine_energy_analysis(date, date) TO authenticated;
