import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';

// ============ get_so_line_boxes payload ============
export type BoxStatus =
  | 'ok' | 'busy' | 'short' | 'ordered' | 'blocked' | 'not_set' | 'na' | 'pending' | 'running' | 'partial';

export type BoxKey = 'mold' | 'machine' | 'raw_material' | 'pigment' | 'components' | 'packing' | 'production' | 'dispatch';

export interface MoldItem {
  mold_id: string;
  mold_number: string;
  cavities: number | null;
  location: string | null;
  mold_status: string | null;
  ownership: string | null;
  current_shots: number | null;
  shot_life: number | null;
  maintenance_wo: string | null;
  maintenance_status: string | null;
  maintenance_till: string | null;
  problem_description: string | null;
  running_job: string | null;
  running_product: string | null;
  running_on_machine: string | null;
  running_remaining: number | null;
  running_job_eta: string | null;
  free_from: string | null;
}

export interface MachineItem {
  machine_id: string;
  machine_code: string;
  machine_type: string | null;
  tonnage: number | null;
  department_id: string | null;
  machine_status: string | null;
  stop_reason: string | null;
  maintenance_wo: string | null;
  maintenance_status: string | null;
  maintenance_till: string | null;
  current_job: string | null;
  current_product: string | null;
  current_remaining: number | null;
  current_rate: number | null;
  current_job_eta: string | null;
  queued_jobs: number | null;
  queued_list: string | null;
  free_from: string | null;
  free_now: boolean | null;
  times_used?: number | null;
  last_used?: string | null;
  used_before?: boolean | null;
}

export interface MaterialItem {
  name: string;
  unit: string | null;
  required: number;
  in_stock: number;
  reserved_by_older_orders: number;
  free_for_this: number;
  shortfall: number;
  incoming_qty: number | null;
  po_numbers: string | null;
  expected_date: string | null;
  note: string | null;
}

interface BoxBase {
  key: BoxKey;
  title: string;
  title_ur: string | null;
  status: BoxStatus;
  summary: string | null;
  available_from?: string | null;
}
export interface MoldBox extends BoxBase { key: 'mold'; items: MoldItem[] }
export interface MachineBox extends BoxBase { key: 'machine'; items: MachineItem[] }
export interface MaterialBox extends BoxBase { key: 'raw_material' | 'pigment' | 'packing' | 'components'; items: MaterialItem[] }
export interface ProductionBox extends BoxBase {
  key: 'production';
  to_make: number | null;
  rate_per_hour: number | null;
  rate_source: string | null;
  hours_per_day: number | null;
  days_needed: number | null;
  earliest_start: string | null;
  expected_finish: string | null;
  blocked_by: string[] | null;
}
export interface DispatchBox extends BoxBase {
  key: 'dispatch';
  required_date: string | null;
  days_left: number | null;
  on_time: boolean | null;
}
export type Box = MoldBox | MachineBox | MaterialBox | ProductionBox | DispatchBox;

export interface LinePlan {
  to_make: number | null;
  rate_per_hour: number | null;
  days_needed: number | null;
  earliest_start: string | null;
  expected_finish: string | null;
  required_date: string | null;
}

export interface LineBoxes {
  line: {
    sales_order_item_id: string;
    sales_order_id: string;
    so_number: string;
    client_name: string | null;
    product_id: string | null;
    product_code: string | null;
    product_name: string | null;
    color: string | null;
    ordered_qty: number;
    dispatched_qty: number;
    in_dispatch_qty: number;
    ready_qty: number;
    remaining_qty: number;
    required_date: string | null;
    days_left: number | null;
    is_overdue: boolean | null;
    [k: string]: unknown;
  };
  error?: string;
  plan?: LinePlan;
  boxes?: Box[];
}

/** Display order of the boxes. */
export const BOX_ORDER: BoxKey[] = ['mold', 'machine', 'raw_material', 'pigment', 'components', 'packing', 'production', 'dispatch'];

/** Tables whose changes move a line's boxes. All are in the realtime publication. */
const BOX_TABLES = [
  'production_jobs', 'hourly_production', 'machines', 'maintenance_work_orders', 'material_lots',
  'dispatches', 'dispatch_items', 'sales_order_items', 'sales_orders', 'sales_order_allocations', 'mixing_batch_slots',
];

export function useLineBoxes(soiId: string | undefined) {
  useRealtimeInvalidate(BOX_TABLES, [['so-line-boxes', soiId]], !!soiId);
  return useQuery({
    queryKey: ['so-line-boxes', soiId],
    enabled: !!soiId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_so_line_boxes', { _soi: soiId! });
      if (error) throw error;
      return data as unknown as LineBoxes;
    },
    staleTime: 15_000,
  });
}

/**
 * name → material_id for the materials in this product's BOM (and its parts'
 * BOMs). The box items carry only names and material names are not unique,
 * so "Create PO" resolves the id from the BOM first.
 */
export function useLineMaterialIds(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['line-material-ids', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data: own, error } = await supabase
        .from('v_product_bom')
        .select('material_id, material_name, component_product_id')
        .eq('product_id', productId!);
      if (error) throw error;
      const parts = (own || []).map((r: any) => r.component_product_id).filter(Boolean);
      let rows = (own || []) as any[];
      if (parts.length) {
        const { data: sub } = await supabase.from('v_product_bom').select('material_id, material_name').in('product_id', parts);
        rows = rows.concat(sub || []);
      }
      const map: Record<string, string> = {};
      rows.forEach((r) => { if (r.material_id && r.material_name) map[String(r.material_name).toLowerCase()] = r.material_id; });
      return map;
    },
    staleTime: 60_000,
  });
}

export function useSetLineProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ soiId, productId }: { soiId: string; productId: string }) => {
      const { error } = await supabase.from('sales_order_items').update({ product_id: productId }).eq('id', soiId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['so-line-boxes', v.soiId] });
      qc.invalidateQueries({ queryKey: ['sales-order'] });
      qc.invalidateQueries({ queryKey: ['so-readiness'] });
      qc.invalidateQueries({ queryKey: ['so-readiness-steps'] });
      toast.success('Product set on the order line');
    },
    onError: (e: any) => toast.error(e.message || 'Could not update the order line'),
  });
}

// ============ Availability pages ============
export interface MoldAvailability extends MoldItem {}

export function useMachineAvailability() {
  useRealtimeInvalidate(['machines', 'production_jobs', 'hourly_production', 'maintenance_work_orders'], [['machine-availability']]);
  return useQuery({
    queryKey: ['machine-availability'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_machine_availability').select('*').order('free_from', { nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as MachineItem[];
    },
    staleTime: 30_000,
  });
}

export function useMoldAvailability() {
  useRealtimeInvalidate(['production_jobs', 'maintenance_work_orders', 'machines'], [['mold-availability']]);
  return useQuery({
    queryKey: ['mold-availability'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_mold_availability').select('*').order('mold_number');
      if (error) throw error;
      return (data || []) as unknown as MoldAvailability[];
    },
    staleTime: 30_000,
  });
}

export interface JobEta {
  job_id: string;
  job_number: string;
  job_status: string;
  machine_id: string | null;
  product_code: string | null;
  planned_qty: number | null;
  actual_qty: number | null;
  remaining_qty: number | null;
  rate_per_hour: number | null;
  rate_source: string | null;
  hours_left: number | null;
  eta_date: string | null;
}

/** Open jobs keyed by job_number (to show remaining/rate_source on machine cards). */
export function useJobEtas() {
  return useQuery({
    queryKey: ['job-etas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_job_eta').select('*');
      if (error) throw error;
      const map: Record<string, JobEta> = {};
      (data || []).forEach((j: any) => { map[j.job_number] = j; });
      return map;
    },
    staleTime: 30_000,
  });
}
