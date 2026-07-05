import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ Types ============
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type SalesOrderStatus = 'open' | 'in_production' | 'fulfilled' | 'closed' | 'cancelled';

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  product_id: string;
  qty: number;
  selling_price: number;
  labour_price: number;
  line_total?: number;
  products?: { name: string; code: string };
}

export interface Quotation {
  id: string;
  quote_number: string;
  client_id: string;
  quote_date: string;
  valid_until: string | null;
  status: QuotationStatus;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string };
  quotation_items?: QuotationItem[];
}

export interface SalesOrderItem {
  id?: string;
  sales_order_id?: string;
  product_id: string;
  ordered_qty: number;
  selling_price: number;
  labour_price: number;
  line_total?: number;
  produced_qty?: number;
  dispatched_qty?: number;
  notes?: string | null;
  products?: { name: string; code: string };
}

export interface SalesOrder {
  id: string;
  so_number: string;
  client_id: string;
  quotation_id: string | null;
  customer_po_number: string | null;
  customer_po_date: string | null;
  order_date: string;
  required_date: string | null;
  status: SalesOrderStatus;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string };
  sales_order_items?: SalesOrderItem[];
}

// ============ Quotations ============
export function useQuotations(filters?: { status?: string; clientId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['quotations', filters],
    queryFn: async () => {
      let q = supabase
        .from('quotations')
        .select('*, clients(name), quotation_items(id)')
        .order('quote_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.clientId && filters.clientId !== 'all') q = q.eq('client_id', filters.clientId);
      if (filters?.startDate) q = q.gte('quote_date', filters.startDate);
      if (filters?.endDate) q = q.lte('quote_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Quotation[];
    },
  });
}

export function useQuotation(id: string | undefined) {
  return useQuery({
    queryKey: ['quotation', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*, clients(*), quotation_items(*, products(name, code))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as Quotation;
    },
  });
}

export function useUpsertQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      client_id: string;
      quote_date: string;
      valid_until?: string | null;
      tax_percent: number;
      notes?: string | null;
      items: Array<Pick<QuotationItem, 'product_id' | 'qty' | 'selling_price' | 'labour_price'>>;
    }) => {
      const { id, items, ...header } = payload;
      let quotationId = id;
      if (quotationId) {
        const { error } = await supabase
          .from('quotations')
          .update(header)
          .eq('id', quotationId);
        if (error) throw error;
        await supabase.from('quotation_items').delete().eq('quotation_id', quotationId);
      } else {
        const { data, error } = await supabase
          .from('quotations')
          .insert([{ ...header, quote_number: '' }])
          .select('id')
          .single();
        if (error) throw error;
        quotationId = (data as any).id;
      }
      if (items.length) {
        const rows = items.map((it) => ({ ...it, quotation_id: quotationId! }));
        const { error } = await supabase.from('quotation_items').insert(rows);
        if (error) throw error;
      }
      return quotationId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['quotation'] });
      toast.success('Quotation saved');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save quotation'),
  });
}

export function useUpdateQuotationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuotationStatus }) => {
      const { error } = await supabase.from('quotations').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['quotation'] });
    },
  });
}

export function useDeleteQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Cannot delete'),
  });
}

// ============ Sales Orders ============
export function useSalesOrders(filters?: { status?: string; clientId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: async () => {
      let q = supabase
        .from('sales_orders')
        .select('*, clients(name), sales_order_items(id, ordered_qty, produced_qty, dispatched_qty)')
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.clientId && filters.clientId !== 'all') q = q.eq('client_id', filters.clientId);
      if (filters?.startDate) q = q.gte('order_date', filters.startDate);
      if (filters?.endDate) q = q.lte('order_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SalesOrder[];
    },
  });
}

export function useSalesOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['sales-order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*, clients(*), sales_order_items(*, products(name, code))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as SalesOrder;
    },
  });
}

export function useUpsertSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      client_id: string;
      quotation_id?: string | null;
      customer_po_number?: string | null;
      customer_po_date?: string | null;
      order_date: string;
      required_date?: string | null;
      tax_percent: number;
      notes?: string | null;
      items: Array<Pick<SalesOrderItem, 'product_id' | 'ordered_qty' | 'selling_price' | 'labour_price' | 'notes'>>;
    }) => {
      const { id, items, ...header } = payload;
      let soId = id;
      if (soId) {
        const { error } = await supabase.from('sales_orders').update(header).eq('id', soId);
        if (error) throw error;
        await supabase.from('sales_order_items').delete().eq('sales_order_id', soId);
      } else {
        const { data, error } = await supabase
          .from('sales_orders')
          .insert([{ ...header, so_number: '' }])
          .select('id')
          .single();
        if (error) throw error;
        soId = (data as any).id;
      }
      if (items.length) {
        const rows = items.map((it) => ({ ...it, sales_order_id: soId! }));
        const { error } = await supabase.from('sales_order_items').insert(rows);
        if (error) throw error;
      }
      return soId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['sales-order'] });
      toast.success('Sales order saved');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save sales order'),
  });
}

export function useUpdateSalesOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SalesOrderStatus }) => {
      const { error } = await supabase.from('sales_orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['sales-order'] });
    },
  });
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Sales order deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Cannot delete'),
  });
}

// Accept a quotation and create a draft sales order from it
export function useAcceptQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      quotationId,
      customerPoNumber,
      customerPoDate,
      requiredDate,
    }: {
      quotationId: string;
      customerPoNumber: string;
      customerPoDate: string;
      requiredDate?: string | null;
    }) => {
      const { data: q, error: qe } = await supabase
        .from('quotations')
        .select('*, quotation_items(product_id, qty, selling_price, labour_price)')
        .eq('id', quotationId)
        .single();
      if (qe) throw qe;
      const quote = q as any;
      const { data: so, error: se } = await supabase
        .from('sales_orders')
        .insert([
          {
            so_number: '',
            client_id: quote.client_id,
            quotation_id: quotationId,
            customer_po_number: customerPoNumber,
            customer_po_date: customerPoDate,
            order_date: new Date().toISOString().slice(0, 10),
            required_date: requiredDate || null,
            tax_percent: quote.tax_percent,
            notes: quote.notes,
          },
        ])
        .select('id')
        .single();
      if (se) throw se;
      const soId = (so as any).id;
      const items = (quote.quotation_items || []).map((it: any) => ({
        sales_order_id: soId,
        product_id: it.product_id,
        ordered_qty: it.qty,
        selling_price: it.selling_price,
        labour_price: it.labour_price,
      }));
      if (items.length) {
        const { error } = await supabase.from('sales_order_items').insert(items);
        if (error) throw error;
      }
      await supabase.from('quotations').update({ status: 'accepted' }).eq('id', quotationId);
      return soId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['quotation'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Sales order created from quotation');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to accept quotation'),
  });
}

// useReleaseSOToProduction — writes production_jobs; reconnects in Phase 5.

// Fetch last agreed prices for a client+product set (auto-fill quotes/SO)
export async function fetchLastAgreedPrices(clientId: string, productIds: string[]) {
  if (!clientId || productIds.length === 0) return new Map<string, { selling: number; labour: number }>();
  const { data } = await supabase
    .from('dispatch_items')
    .select('product_id, agreed_selling_price, agreed_labour_price, dispatches!inner(client_id, dispatch_date)')
    .eq('dispatches.client_id', clientId)
    .in('product_id', productIds)
    .order('dispatches(dispatch_date)' as any, { ascending: false });
  const map = new Map<string, { selling: number; labour: number }>();
  (data || []).forEach((r: any) => {
    if (!map.has(r.product_id)) {
      map.set(r.product_id, {
        selling: Number(r.agreed_selling_price || 0),
        labour: Number(r.agreed_labour_price || 0),
      });
    }
  });
  return map;
}
