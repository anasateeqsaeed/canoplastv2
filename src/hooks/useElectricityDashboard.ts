import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Electricity Consumption Dashboard data hooks.
 *
 * Two server-side aggregation functions (see migration
 * `electricity_consumption_dashboard_functions`) do the heavy lifting so we
 * never hit PostgREST's 1000-row cap or ship thousands of hourly rows to the
 * browser:
 *   - electricity_daily_summary(start, end)  -> daily grid / solar / total units
 *   - machine_energy_analysis(start, end)    -> per-machine estimated energy use
 *
 * Solar is not separately metered on site, so it is derived as
 * (Internal-Main load - KE-Main grid feed) inside the SQL function.
 * Machine consumption is estimated as assumed_power_kw x run hours because the
 * per-entry electricity_units column is not captured on the shop floor.
 */

export interface ElectricityDailyRow {
  date: string;
  grid: number;
  solar: number;
  total: number;
  submeter: number;
  internal: number;
}

export interface TopProduct {
  product: string;
  qty: number;
  hrs: number;
}

export interface MachineEnergyRow {
  machineId: string;
  machineCode: string;
  department: string;
  powerKw: number | null;
  runHours: number;
  estUnits: number;
  okQty: number;
  rejectQty: number;
  productCount: number;
  topProducts: TopProduct[];
}

export interface ElectricityTariff {
  keRate: number;
  solarRate: number;
  effectiveFrom: string;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

function monthRange(month: Date) {
  return {
    start: format(startOfMonth(month), 'yyyy-MM-dd'),
    end: format(endOfMonth(month), 'yyyy-MM-dd'),
  };
}

export function useElectricityDaily(month: Date) {
  const { start, end } = monthRange(month);
  return useQuery({
    queryKey: ['electricity_daily', start, end],
    queryFn: async (): Promise<ElectricityDailyRow[]> => {
      const { data, error } = await (supabase as any).rpc('electricity_daily_summary', {
        p_start: start,
        p_end: end,
      });
      if (error) throw error;
      return (data ?? []).map((r: any): ElectricityDailyRow => ({
        date: r.reading_date,
        grid: num(r.grid_units),
        solar: num(r.solar_units),
        total: num(r.total_units),
        submeter: num(r.submeter_units),
        internal: num(r.internal_units),
      }));
    },
  });
}

export function useMachineEnergy(month: Date) {
  const { start, end } = monthRange(month);
  return useQuery({
    queryKey: ['machine_energy', start, end],
    queryFn: async (): Promise<MachineEnergyRow[]> => {
      const { data, error } = await (supabase as any).rpc('machine_energy_analysis', {
        p_start: start,
        p_end: end,
      });
      if (error) throw error;
      return (data ?? []).map((r: any): MachineEnergyRow => ({
        machineId: r.machine_id,
        machineCode: (r.machine_code ?? '').trim() || 'Unnamed machine',
        department: (r.department ?? '').trim() || 'Unassigned',
        powerKw: r.power_kw == null ? null : num(r.power_kw),
        runHours: num(r.run_hours),
        estUnits: num(r.est_units),
        okQty: num(r.ok_qty),
        rejectQty: num(r.reject_qty),
        productCount: num(r.product_count),
        topProducts: Array.isArray(r.top_products)
          ? r.top_products.map((p: any): TopProduct => ({
              product: p.product ?? '—',
              qty: num(p.qty),
              hrs: num(p.hrs),
            }))
          : [],
      }));
    },
  });
}

/** Latest tariff effective on/before the given month (KE + solar PKR/unit). */
export function useElectricityTariff(month: Date) {
  const { end } = monthRange(month);
  return useQuery({
    queryKey: ['electricity_tariff', end],
    queryFn: async (): Promise<ElectricityTariff | null> => {
      const { data, error } = await (supabase as any)
        .from('electricity_tariffs')
        .select('effective_from, ke_rate_per_unit, solar_rate_per_unit')
        .lte('effective_from', end)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        keRate: num((data as any).ke_rate_per_unit),
        solarRate: num((data as any).solar_rate_per_unit),
        effectiveFrom: (data as any).effective_from,
      };
    },
  });
}
