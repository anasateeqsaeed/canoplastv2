import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, endOfMonth } from 'date-fns';

// finished_good / component scopes reconnect in Phase 3 (FG) and Phase 5 (production)
export type AdjustmentScope = 'finished_good' | 'raw_material' | 'component';
export type AdjustmentReasonType =
  | 'physical_shortage'
  | 'qc_reject_regrind'
  | 'other'
  | 'opening';

export interface StockAdjustmentLogRow {
  id: string;
  scope: AdjustmentScope;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  as_of_date: string;
  before_qty: number;
  after_qty: number;
  delta: number;
  reason: string;
  material_lot_id: string | null;
  adjusted_by: string | null;
  adjusted_at: string;
  created_at: string;
  reason_type: AdjustmentReasonType | null;
  client_id: string | null;
}

export function useStockAdjustmentLog() {
  return useQuery({
    queryKey: ['stock_adjustment_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_adjustment_log')
        .select('*')
        .order('adjusted_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as StockAdjustmentLogRow[];
    },
  });
}

interface CreateAdjustmentArgs {
  scope: AdjustmentScope;
  item_id: string;
  item_code?: string | null;
  item_name?: string | null;
  /** A Date inside the month being closed. The adjustment posts at that month-end. */
  closing_month: Date;
  before_qty: number;
  after_qty: number;
  reason: string;
  /** 'correction' (default, month-end) or 'opening' (free as-of date). */
  mode?: 'correction' | 'opening';
  /** Required when mode === 'opening'. Exact date to post the balance. */
  as_of_date?: Date;
  reason_type?: AdjustmentReasonType;
  client_id?: string | null;
  // FG-only impact toggles — reconnect in Phase 3/5
  reverse_labour_revenue?: boolean;
  reverse_material_consumption?: boolean;
  create_regrind_return?: boolean;
  consumption_material_id?: string | null;
  weight_per_piece?: number;
}

export function useCreateStockAdjustment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateAdjustmentArgs) => {
      if (args.scope !== 'raw_material') {
        // FG / component adjustments reconnect in Phase 3/5
        throw new Error('Only raw material adjustments are available in this phase');
      }

      const mode = args.mode ?? 'correction';
      const delta = Number((args.after_qty - args.before_qty).toFixed(4));
      const asOf =
        mode === 'opening' && args.as_of_date
          ? args.as_of_date
          : endOfMonth(args.closing_month);
      const asOfIso = format(asOf, 'yyyy-MM-dd');

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      const reasonType: AdjustmentReasonType =
        args.reason_type ?? (mode === 'opening' ? 'opening' : 'other');

      // Raw material: post an adjustment lot carrying the delta
      const lotPrefix = mode === 'opening' ? 'OPEN' : 'ADJ';
      const lotReason =
        mode === 'opening' ? `Opening balance: ${args.reason}` : args.reason;
      const { data: lot, error: lotErr } = await supabase
        .from('material_lots')
        .insert({
          material_id: args.item_id,
          lot_number: `${lotPrefix}-${format(asOf, 'yyyyMMdd')}-${args.item_id.slice(0, 6)}`,
          quantity: delta,
          remaining_qty: Math.max(delta, 0),
          unit: 'kg',
          inspection_status: 'passed',
          received_date: asOfIso,
          is_adjustment: true,
          adjustment_reason: lotReason,
          created_by: userId,
        })
        .select('id')
        .single();
      if (lotErr) throw lotErr;
      const material_lot_id = lot?.id ?? null;

      const { error: logErr } = await supabase
        .from('stock_adjustment_log')
        .insert({
          scope: args.scope,
          item_id: args.item_id,
          item_code: args.item_code ?? null,
          item_name: args.item_name ?? null,
          as_of_date: asOfIso,
          before_qty: args.before_qty,
          after_qty: args.after_qty,
          delta,
          reason: args.reason,
          material_lot_id,
          adjusted_by: userId,
          reason_type: reasonType,
          client_id: args.client_id ?? null,
        });
      if (logErr) throw logErr;

      return { delta, as_of_date: asOfIso };
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Stock adjustment posted');
    },
    onError: (e: any) => {
      toast.error('Adjustment failed: ' + (e?.message ?? String(e)));
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['stock_adjustment_log'] });
  qc.invalidateQueries({ queryKey: ['raw-material-stock'] });
  qc.invalidateQueries({ queryKey: ['material-lots'] });
  qc.invalidateQueries({ queryKey: ['available-material-lots'] });
}

export function useDeleteStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: StockAdjustmentLogRow) => {
      // component / FG linked records reconnect in Phase 3/5
      if (row.material_lot_id) {
        const { error } = await supabase
          .from('material_lots')
          .delete()
          .eq('id', row.material_lot_id);
        if (error) throw error;
      }
      const { error: logErr } = await supabase
        .from('stock_adjustment_log')
        .delete()
        .eq('id', row.id);
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Adjustment deleted');
    },
    onError: (e: any) => toast.error('Delete failed: ' + (e?.message ?? String(e))),
  });
}

interface UpdateAdjustmentArgs {
  row: StockAdjustmentLogRow;
  as_of_date: Date;
  after_qty: number;
  reason: string;
}

export function useUpdateStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ row, as_of_date, after_qty, reason }: UpdateAdjustmentArgs) => {
      const before = Number(row.before_qty);
      const newDelta = Number((after_qty - before).toFixed(4));
      const asOfIso = format(as_of_date, 'yyyy-MM-dd');
      const wasOpening = row.reason_type === 'opening' ||
        (row.reason ?? '').toLowerCase().includes('opening');

      if (row.material_lot_id) {
        const { error } = await supabase
          .from('material_lots')
          .update({
            quantity: newDelta,
            remaining_qty: Math.max(newDelta, 0),
            received_date: asOfIso,
            adjustment_reason: wasOpening ? `Opening balance: ${reason}` : reason,
          })
          .eq('id', row.material_lot_id);
        if (error) throw error;
      }

      const { error: logErr } = await supabase
        .from('stock_adjustment_log')
        .update({
          as_of_date: asOfIso,
          after_qty,
          delta: newDelta,
          reason,
        })
        .eq('id', row.id);
      if (logErr) throw logErr;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Adjustment updated');
    },
    onError: (e: any) => toast.error('Update failed: ' + (e?.message ?? String(e))),
  });
}
