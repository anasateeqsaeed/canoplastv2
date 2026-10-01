import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Customer-level material return + credit note.
// A return is NOT tied to one dispatch: the customer accumulates rejected /
// damaged pieces over weeks and hands them back together. Posting gates the
// material in, restores FG stock and issues a credit note against the
// customer's account (optionally applied to specific invoices).

export type SalesReturnStatus = 'draft' | 'posted' | 'cancelled';
export type SalesReturnReason = 'rejection' | 'quality' | 'damaged' | 'excess' | 'wrong_item' | 'other';
export type ReturnDisposition = 'restock' | 'rework' | 'scrap';

export const RETURN_REASONS: { value: SalesReturnReason; label: string }[] = [
  { value: 'rejection', label: 'Rejection' },
  { value: 'quality', label: 'Quality issue' },
  { value: 'damaged', label: 'Damaged in transit' },
  { value: 'excess', label: 'Excess supply' },
  { value: 'wrong_item', label: 'Wrong item' },
  { value: 'other', label: 'Other' },
];

export const DISPOSITIONS: { value: ReturnDisposition; label: string; hint: string }[] = [
  { value: 'restock', label: 'Restock', hint: 'Good pieces — back into FG stock' },
  { value: 'rework', label: 'Rework', hint: 'Received but needs rework before sale' },
  { value: 'scrap', label: 'Scrap', hint: 'Rejected — goes to grinding / scrap' },
];

export interface SalesReturnItem {
  id: string;
  sales_return_id: string;
  product_id: string;
  dispatch_item_id: string | null;
  quantity: number;
  weight_kg: number | null;
  rate: number;
  line_total: number;
  disposition: ReturnDisposition;
  remarks: string | null;
  sort_order: number;
  products?: { code: string; name: string } | null;
}

export interface SalesReturnAllocation {
  id: string;
  sales_return_id: string;
  invoice_id: string;
  amount: number;
  /** false = removed from this credit note (row kept as history). */
  is_active: boolean;
  removed_at: string | null;
  sales_invoices?: { invoice_number: string; invoice_number_override: string | null; invoice_date: string; total_amount: number } | null;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  credit_note_number: string | null;
  gate_pass_number: string | null;
  client_id: string;
  return_date: string;
  reason: SalesReturnReason;
  reference: string | null;
  returned_by: string | null;
  received_by: string | null;
  vehicle_number: string | null;
  driver_name: string | null;
  tax_percent: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: SalesReturnStatus;
  notes: string | null;
  gate_movement_id: string | null;
  gl_voucher_id: string | null;
  created_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string; code: string; address: string | null; phone: string | null; gst_number: string | null } | null;
  sales_return_items?: SalesReturnItem[];
  sales_return_allocations?: SalesReturnAllocation[];
}

export interface SalesReturnLineInput {
  product_id: string;
  dispatch_item_id?: string | null;
  quantity: number;
  weight_kg?: number | null;
  rate: number;
  disposition: ReturnDisposition;
  remarks?: string | null;
}

export interface SalesReturnHeaderInput {
  client_id: string;
  return_date: string;
  reason: SalesReturnReason;
  reference?: string | null;
  returned_by?: string | null;
  received_by?: string | null;
  vehicle_number?: string | null;
  driver_name?: string | null;
  tax_percent: number;
  notes?: string | null;
}

const LIST_SELECT = '*, clients(name, code, address, phone, gst_number), sales_return_items(id, quantity, product_id)';
const DETAIL_SELECT =
  '*, clients(name, code, address, phone, gst_number), ' +
  'sales_return_items(*, products(code, name)), ' +
  'sales_return_allocations(*, sales_invoices(invoice_number, invoice_number_override, invoice_date, total_amount))';

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['sales-returns'] });
  qc.invalidateQueries({ queryKey: ['sales-return'] });
  qc.invalidateQueries({ queryKey: ['sales-invoices'] });
  qc.invalidateQueries({ queryKey: ['sales-invoice'] });
  qc.invalidateQueries({ queryKey: ['finished-goods-stock'] });
  qc.invalidateQueries({ queryKey: ['fg-stock-balances'] });
  qc.invalidateQueries({ queryKey: ['fg-stock-txns'] });
  qc.invalidateQueries({ queryKey: ['client-product-ledger'] });
  qc.invalidateQueries({ queryKey: ['client-account-statement'] });
  qc.invalidateQueries({ queryKey: ['client-open-invoices'] });
}

export function useSalesReturns(filters?: {
  status?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['sales-returns', filters],
    queryFn: async () => {
      let q = supabase
        .from('sales_returns')
        .select(LIST_SELECT)
        .order('return_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.clientId) q = q.eq('client_id', filters.clientId);
      if (filters?.startDate) q = q.gte('return_date', filters.startDate);
      if (filters?.endDate) q = q.lte('return_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SalesReturn[];
    },
  });
}

export function useSalesReturn(id: string | undefined) {
  return useQuery({
    queryKey: ['sales-return', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_returns')
        .select(DETAIL_SELECT)
        .eq('id', id!)
        .single();
      if (error) throw error;
      const ret = data as unknown as SalesReturn;
      ret.sales_return_items = [...(ret.sales_return_items || [])].sort((a, b) => a.sort_order - b.sort_order);
      // Only live allocations count; inactive rows are history.
      ret.sales_return_allocations = (ret.sales_return_allocations || []).filter((a) => a.is_active);
      return ret;
    },
  });
}

async function replaceLines(returnId: string, lines: SalesReturnLineInput[]) {
  const { error: delErr } = await supabase.from('sales_return_items').delete().eq('sales_return_id', returnId);
  if (delErr) throw delErr;
  const rows = lines
    .filter((l) => l.product_id && Number(l.quantity) > 0)
    .map((l, idx) => ({
      sales_return_id: returnId,
      product_id: l.product_id,
      dispatch_item_id: l.dispatch_item_id || null,
      quantity: Math.round(Number(l.quantity)),
      weight_kg: l.weight_kg ? Number(l.weight_kg) : null,
      rate: Number(l.rate) || 0,
      disposition: l.disposition || 'restock',
      remarks: l.remarks || null,
      sort_order: idx,
    }));
  if (rows.length) {
    const { error } = await supabase.from('sales_return_items').insert(rows);
    if (error) throw error;
  }
}

export function useCreateSalesReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ header, lines }: { header: SalesReturnHeaderInput; lines: SalesReturnLineInput[] }) => {
      const { data, error } = await supabase
        .from('sales_returns')
        .insert({
          return_number: '',
          client_id: header.client_id,
          return_date: header.return_date,
          reason: header.reason,
          reference: header.reference || null,
          returned_by: header.returned_by || null,
          received_by: header.received_by || null,
          vehicle_number: header.vehicle_number || null,
          driver_name: header.driver_name || null,
          tax_percent: Number(header.tax_percent) || 0,
          notes: header.notes || null,
          status: 'draft',
        })
        .select('id, return_number')
        .single();
      if (error) throw error;
      await replaceLines(data.id, lines);
      return data as { id: string; return_number: string };
    },
    onSuccess: (d) => {
      invalidateAll(qc);
      toast.success(`Return ${d.return_number} saved as draft`);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save return'),
  });
}

export function useUpdateSalesReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, header, lines }: { id: string; header: SalesReturnHeaderInput; lines: SalesReturnLineInput[] }) => {
      const { error } = await supabase
        .from('sales_returns')
        .update({
          client_id: header.client_id,
          return_date: header.return_date,
          reason: header.reason,
          reference: header.reference || null,
          returned_by: header.returned_by || null,
          received_by: header.received_by || null,
          vehicle_number: header.vehicle_number || null,
          driver_name: header.driver_name || null,
          tax_percent: Number(header.tax_percent) || 0,
          notes: header.notes || null,
        })
        .eq('id', id);
      if (error) throw error;
      await replaceLines(id, lines);
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Return updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update return'),
  });
}

export function useDeleteSalesReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales_returns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Draft return deleted');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete'),
  });
}

/** Gate-in + FG stock restore + credit note number. */
export function usePostSalesReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('post_sales_return', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Return posted — material gated in and credit note issued');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to post return'),
  });
}

export function useCancelSalesReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase.rpc('cancel_sales_return', { p_id: id, p_reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Return cancelled');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to cancel'),
  });
}

/** Books the credit note into the GL (accounting roles only). */
export function usePostSalesReturnToGl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('post_sales_return_to_gl', { p_id: id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Credit note booked to the general ledger');
    },
    onError: (e: Error) => toast.error(e.message || 'GL posting failed'),
  });
}

export function useSetSalesReturnAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, allocations }: { id: string; allocations: { invoice_id: string; amount: number }[] }) => {
      const { error } = await supabase.rpc('set_sales_return_allocations', {
        p_id: id,
        p_allocations: allocations.filter((a) => a.amount > 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Credit note applied to invoices');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to apply credit note'),
  });
}

/** Issued invoices of a customer with amount outstanding (for allocation). */
export function useClientOpenInvoices(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-open-invoices', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, invoice_number_override, invoice_date, total_amount, amount_paid, payment_status')
        .eq('client_id', clientId!)
        .eq('status', 'issued')
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        invoice_number: string;
        invoice_number_override: string | null;
        invoice_date: string;
        total_amount: number;
        amount_paid: number;
        payment_status: string;
      }>;
    },
  });
}

/**
 * Rate to credit for a product returned by a customer: the most recent
 * dispatch rate agreed with that customer, else the product's list price.
 */
export async function fetchReturnRate(clientId: string, productId: string, onDate: string): Promise<{ rate: number; source: string }> {
  const { data: di } = await supabase
    .from('dispatch_items')
    .select('agreed_selling_price, dispatches!inner(client_id, dispatch_date)')
    .eq('product_id', productId)
    .eq('dispatches.client_id', clientId)
    .not('agreed_selling_price', 'is', null)
    .order('dispatches(dispatch_date)', { ascending: false })
    .limit(1);
  const last = (di || [])[0] as { agreed_selling_price: number | null } | undefined;
  if (last && last.agreed_selling_price != null) {
    return { rate: Number(last.agreed_selling_price), source: 'last dispatch' };
  }
  const { data: price } = await supabase.rpc('get_product_price_on', { _product_id: productId, _on_date: onDate });
  const p = (price || [])[0];
  if (p && p.selling_price != null) return { rate: Number(p.selling_price), source: 'price list' };
  const { data: prod } = await supabase.from('products').select('selling_price').eq('id', productId).single();
  return { rate: Number(prod?.selling_price || 0), source: 'product master' };
}

// ---------- Customer ledgers ----------

export interface ClientProductLedgerRow {
  product_id: string;
  product_code: string;
  product_name: string;
  dispatched_qty: number;
  dispatch_returned_qty: number;
  sales_returned_qty: number;
  net_qty: number;
  dispatched_value: number;
  credited_value: number;
  last_dispatch_date: string | null;
  last_return_date: string | null;
}

export function useClientProductLedger(clientId: string | undefined, from?: string, to?: string) {
  return useQuery({
    queryKey: ['client-product-ledger', clientId, from, to],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('client_product_ledger', {
        p_client_id: clientId!,
        p_from: from || null,
        p_to: to || null,
      });
      if (error) throw error;
      return (data || []).map((r) => ({
        ...r,
        dispatched_qty: Number(r.dispatched_qty || 0),
        dispatch_returned_qty: Number(r.dispatch_returned_qty || 0),
        sales_returned_qty: Number(r.sales_returned_qty || 0),
        net_qty: Number(r.net_qty || 0),
        dispatched_value: Number(r.dispatched_value || 0),
        credited_value: Number(r.credited_value || 0),
      })) as ClientProductLedgerRow[];
    },
  });
}

export interface ClientStatementRow {
  entry_date: string;
  doc_type: 'invoice' | 'credit_note' | 'receipt';
  doc_number: string;
  doc_id: string;
  description: string;
  debit: number;
  credit: number;
  sort_ts: string | null;
  balance: number;
}

export function useClientAccountStatement(clientId: string | undefined, from?: string, to?: string) {
  return useQuery({
    queryKey: ['client-account-statement', clientId, from, to],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('client_account_statement', {
        p_client_id: clientId!,
        p_from: from || null,
        p_to: to || null,
      });
      if (error) throw error;
      const rows = (data || [])
        .map((r) => ({ ...r, debit: Number(r.debit || 0), credit: Number(r.credit || 0) }))
        .sort((a, b) =>
          a.entry_date.localeCompare(b.entry_date) || String(a.sort_ts || '').localeCompare(String(b.sort_ts || '')),
        );
      let bal = 0;
      return rows.map((r): ClientStatementRow => {
        bal += r.debit - r.credit;
        return { ...r, doc_type: r.doc_type as ClientStatementRow['doc_type'], balance: bal };
      });
    },
  });
}
