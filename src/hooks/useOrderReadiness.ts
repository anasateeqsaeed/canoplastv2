import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { READINESS_TABLES, useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';

export type StepStatus = 'done' | 'partial' | 'pending' | 'blocked' | 'not_set' | 'na';

export interface ReadinessStep {
  sales_order_id: string;
  so_number: string;
  client_name: string | null;
  product_name: string | null;
  sales_order_item_id: string;
  step_no: number;
  step_key: string;
  label: string;
  label_ur: string | null;
  weight: number;
  status: StepStatus;
  detail: string | null;
  eta: string | null;
  score: number | null;
}

export interface ReadinessLine {
  sales_order_id: string;
  so_number: string;
  client_name: string | null;
  product_name: string | null;
  sales_order_item_id: string;
  overall_pct: number | null;
  steps_done: number;
  steps_total: number;
  steps_blocked: number;
  steps_not_set: number;
  pending_list: string | null;
  closure_pct: number | null;
  closure_done: number | null;
  closure_total: number | null;
  closure_blocked: number | null;
  closure_pending_list: string | null;
  grand_pct: number | null;
  ready_to_close: boolean | null;
}

/** One order's roll-up across all its lines (simple mean of line percentages). */
export interface OrderReadinessSummary {
  sales_order_id: string;
  so_number: string;
  client_name: string | null;
  lines: ReadinessLine[];
  overall_pct: number;
  closure_pct: number;
  grand_pct: number;
  closure_blocked: number;
  steps_blocked: number;
  ready_to_close: boolean;
}

export const READINESS_KEYS = [
  ['so-readiness'],
  ['so-readiness-steps'],
  ['so-closure-steps'],
  ['so-closure-links'],
  ['closure-pending'],
  ['readiness-weights'],
  ['sales-orders'],
  ['sales-order'],
];

const n = (v: unknown) => (v == null ? 0 : Number(v));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;

export function summarizeOrder(lines: ReadinessLine[]): OrderReadinessSummary | null {
  if (!lines.length) return null;
  const f = lines[0];
  return {
    sales_order_id: f.sales_order_id,
    so_number: f.so_number,
    client_name: f.client_name,
    lines,
    overall_pct: r1(mean(lines.map((l) => n(l.overall_pct)))),
    closure_pct: r1(mean(lines.map((l) => n(l.closure_pct)))),
    grand_pct: r1(mean(lines.map((l) => n(l.grand_pct)))),
    closure_blocked: lines.reduce((s, l) => s + n(l.closure_blocked), 0),
    steps_blocked: lines.reduce((s, l) => s + n(l.steps_blocked), 0),
    ready_to_close: lines.every((l) => !!l.ready_to_close),
  };
}

/** Per-order readiness summaries, keyed by sales_order_id. Pass ids to limit the fetch. */
export function useOrderReadinessMap(orderIds?: string[]) {
  const ids = orderIds ? [...orderIds].sort() : undefined;
  return useQuery({
    queryKey: ['so-readiness', ids ?? 'all'],
    enabled: !ids || ids.length > 0,
    queryFn: async () => {
      let q = supabase.from('v_so_readiness').select('*');
      if (ids) q = q.in('sales_order_id', ids);
      const { data, error } = await q;
      if (error) throw error;
      const byOrder = new Map<string, ReadinessLine[]>();
      (data as unknown as ReadinessLine[]).forEach((l) => {
        const arr = byOrder.get(l.sales_order_id) ?? [];
        arr.push(l);
        byOrder.set(l.sales_order_id, arr);
      });
      const out: Record<string, OrderReadinessSummary> = {};
      byOrder.forEach((lines, id) => {
        const s = summarizeOrder(lines);
        if (s) out[id] = s;
      });
      return out;
    },
  });
}

export function useReadinessSteps(orderId: string | undefined) {
  return useQuery({
    queryKey: ['so-readiness-steps', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_so_readiness_steps')
        .select('*')
        .eq('sales_order_id', orderId!)
        .order('step_no');
      if (error) throw error;
      return (data || []) as unknown as ReadinessStep[];
    },
  });
}

export function useClosureSteps(orderId: string | undefined) {
  return useQuery({
    queryKey: ['so-closure-steps', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_so_closure_steps')
        .select('*')
        .eq('sales_order_id', orderId!)
        .order('step_no');
      if (error) throw error;
      return (data || []) as unknown as ReadinessStep[];
    },
  });
}

export interface ClosureDC {
  dispatch_id: string;
  dispatch_number: string;
  dispatch_date: string;
  client_id: string;
  sales_order_item_ids: string[];
  invoice: { id: string; invoice_number: string; status: string; payment_status: string | null } | null;
  confirmation: {
    receiving_status: string | null;
    qc_status: string | null;
    bilty_required: boolean | null;
    bilty_received: boolean | null;
    issue_status: string | null;
  } | null;
}

/**
 * Dispatches (dispatched/delivered) that carry this order's lines, with their
 * invoice + delivery confirmation — used to link each closure step to the
 * screen where it gets fixed.
 */
export function useOrderClosureLinks(orderId: string | undefined, itemIds: string[]) {
  const ids = [...itemIds].sort();
  return useQuery({
    queryKey: ['so-closure-links', orderId, ids],
    enabled: !!orderId && ids.length > 0,
    queryFn: async () => {
      const { data: di, error } = await supabase
        .from('dispatch_items')
        .select('sales_order_item_id, dispatch_id, dispatches!inner(id, dispatch_number, dispatch_date, status, client_id)')
        .in('sales_order_item_id', ids);
      if (error) throw error;
      const map = new Map<string, ClosureDC>();
      (di as any[] || []).forEach((row) => {
        const d = row.dispatches;
        if (!d || !['dispatched', 'delivered'].includes(d.status)) return;
        const cur = map.get(d.id) ?? {
          dispatch_id: d.id,
          dispatch_number: d.dispatch_number,
          dispatch_date: d.dispatch_date,
          client_id: d.client_id,
          sales_order_item_ids: [],
          invoice: null,
          confirmation: null,
        };
        if (!cur.sales_order_item_ids.includes(row.sales_order_item_id)) cur.sales_order_item_ids.push(row.sales_order_item_id);
        map.set(d.id, cur);
      });
      const dcIds = [...map.keys()];
      if (dcIds.length) {
        const [{ data: inv }, { data: conf }] = await Promise.all([
          supabase
            .from('sales_invoice_dispatches')
            .select('dispatch_id, sales_invoices(id, invoice_number, status, payment_status, created_at)')
            .in('dispatch_id', dcIds),
          supabase
            .from('dispatch_delivery_confirmations')
            .select('dispatch_id, receiving_status, qc_status, bilty_required, bilty_received, issue_status')
            .in('dispatch_id', dcIds),
        ]);
        (inv as any[] || []).forEach((r) => {
          const si = r.sales_invoices;
          const dc = map.get(r.dispatch_id);
          if (!si || !dc) return;
          // Same preference as the view: an issued invoice wins, else the newest.
          const better =
            !dc.invoice ||
            (si.status === 'issued' && dc.invoice.status !== 'issued');
          if (better) dc.invoice = { id: si.id, invoice_number: si.invoice_number, status: si.status, payment_status: si.payment_status };
        });
        (conf as any[] || []).forEach((c) => {
          const dc = map.get(c.dispatch_id);
          if (dc) dc.confirmation = c;
        });
      }
      return [...map.values()].sort((a, b) => a.dispatch_date.localeCompare(b.dispatch_date));
    },
  });
}

/** Realtime: keep readiness/closure numbers fresh on any screen that shows them. */
export function useReadinessRealtime(enabled = true) {
  useRealtimeInvalidate(READINESS_TABLES, READINESS_KEYS, enabled);
}

export function useCloseSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales_orders').update({ status: 'closed' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      READINESS_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      toast.success('Order closed / آرڈر بند ہو گیا');
    },
    onError: (e: any) => toast.error(e.message || 'Could not close order'),
  });
}

// ============ Weights ============
export interface ReadinessWeight {
  step_key: string;
  step_no: number;
  label: string;
  label_ur: string | null;
  weight: number;
  is_active: boolean;
  phase: 'order' | 'closure' | 'phase';
  note: string | null;
  updated_at: string;
}

export function useReadinessWeights() {
  return useQuery({
    queryKey: ['readiness-weights'],
    queryFn: async () => {
      const { data, error } = await supabase.from('so_readiness_weights').select('*').order('step_no');
      if (error) throw error;
      return (data || []).map((w: any) => ({ ...w, weight: Number(w.weight) })) as ReadinessWeight[];
    },
  });
}

export function useUpdateReadinessWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<Pick<ReadinessWeight, 'step_key' | 'weight' | 'is_active'>>) => {
      for (const r of rows) {
        const { error } = await supabase
          .from('so_readiness_weights')
          .update({ weight: r.weight, is_active: r.is_active, updated_at: new Date().toISOString() })
          .eq('step_key', r.step_key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      READINESS_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      toast.success('Weights saved');
    },
    onError: (e: any) => toast.error(e.message || 'Could not save weights'),
  });
}

// ============ Dashboard: closure pending ============
export interface ClosurePendingOrder {
  sales_order_id: string;
  so_number: string;
  client_name: string | null;
  closure_pct: number;
  oldest_dispatch: string | null;
  invoice_pending: boolean;
  receiving_pending: boolean;
  qc_pending: boolean;
  issue_open: boolean;
  payment_pending: boolean;
}

export function useClosurePending() {
  return useQuery({
    queryKey: ['closure-pending'],
    queryFn: async () => {
      // Closure steps of orders that have at least one dispatch (n_dc > 0 ⇒ detail isn't the "no dispatch" text).
      const { data: steps, error } = await supabase
        .from('v_so_closure_steps')
        .select('sales_order_id, so_number, client_name, sales_order_item_id, step_key, status, detail, weight, score');
      if (error) throw error;
      const rows = (steps || []) as unknown as ReadinessStep[];
      const itemIds = [...new Set(rows.map((r) => r.sales_order_item_id))];
      // Oldest dispatch per sales order item.
      const oldest = new Map<string, string>();
      if (itemIds.length) {
        const { data: di, error: e2 } = await supabase
          .from('dispatch_items')
          .select('sales_order_item_id, dispatches!inner(dispatch_date, status)')
          .in('sales_order_item_id', itemIds);
        if (e2) throw e2;
        (di as any[] || []).forEach((r) => {
          const d = r.dispatches;
          if (!d || !['dispatched', 'delivered'].includes(d.status)) return;
          const cur = oldest.get(r.sales_order_item_id);
          if (!cur || d.dispatch_date < cur) oldest.set(r.sales_order_item_id, d.dispatch_date);
        });
      }
      const byOrder = new Map<string, ReadinessStep[]>();
      rows.forEach((r) => {
        if (!oldest.has(r.sales_order_item_id)) return; // not dispatched yet
        const arr = byOrder.get(r.sales_order_id) ?? [];
        arr.push(r);
        byOrder.set(r.sales_order_id, arr);
      });
      // Skip closed / cancelled orders.
      const orderIds = [...byOrder.keys()];
      const closed = new Set<string>();
      if (orderIds.length) {
        const { data: so } = await supabase.from('sales_orders').select('id, status').in('id', orderIds);
        (so || []).forEach((s: any) => { if (s.status === 'closed' || s.status === 'cancelled') closed.add(s.id); });
      }
      const out: ClosurePendingOrder[] = [];
      byOrder.forEach((st, id) => {
        if (closed.has(id)) return;
        let wSum = 0;
        let wScore = 0;
        // closure_pct across lines = mean of per-line weighted score
        const perLine = new Map<string, { w: number; s: number }>();
        st.forEach((s) => {
          const p = perLine.get(s.sales_order_item_id) ?? { w: 0, s: 0 };
          p.w += Number(s.weight);
          p.s += Number(s.weight) * Number(s.score ?? 0);
          perLine.set(s.sales_order_item_id, p);
        });
        perLine.forEach((p) => { wSum += 1; wScore += p.w ? (100 * p.s) / p.w : 0; });
        const pct = wSum ? Math.round((wScore / wSum) * 10) / 10 : 0;
        if (pct >= 100) return;
        const notDone = (key: string) => st.some((s) => s.step_key === key && s.status !== 'done');
        const lines = [...perLine.keys()];
        const dates = lines.map((l) => oldest.get(l)!).filter(Boolean).sort();
        out.push({
          sales_order_id: id,
          so_number: st[0].so_number,
          client_name: st[0].client_name,
          closure_pct: pct,
          oldest_dispatch: dates[0] ?? null,
          invoice_pending: notDone('invoice'),
          receiving_pending: notDone('receiving'),
          qc_pending: notDone('qc_bilty'),
          issue_open: st.some((s) => s.step_key === 'qc_bilty' && s.status === 'blocked'),
          payment_pending: notDone('payment'),
        });
      });
      return out.sort((a, b) => (a.oldest_dispatch ?? '').localeCompare(b.oldest_dispatch ?? ''));
    },
  });
}
