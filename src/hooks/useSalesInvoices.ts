import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  invoice_number_override?: string | null;
  invoice_date: string;
  client_id: string;
  invoice_type: 'dispatch' | 'consolidated';
  period_from: string | null;
  period_to: string | null;
  bill_to_name?: string | null;
  bill_to_address?: string | null;
  bill_to_gst?: string | null;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  freight_charges: number;
  other_charges: number;
  total_amount: number;
  status: 'draft' | 'issued' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string; address: string | null; phone: string | null; gst_number: string | null };
  sales_invoice_dispatches?: Array<{ dispatch_id: string }>;
}

export function useSalesInvoices(filters?: {
  status?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['sales-invoices', filters],
    queryFn: async () => {
      let q = supabase
        .from('sales_invoices')
        .select('*, clients(name, address, phone, gst_number), sales_invoice_dispatches(dispatch_id)')
        .order('invoice_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.clientId) q = q.eq('client_id', filters.clientId);
      if (filters?.startDate) q = q.gte('invoice_date', filters.startDate);
      if (filters?.endDate) q = q.lte('invoice_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SalesInvoice[];
    },
  });
}

export function useSalesInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['sales-invoice', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('*, clients(*), sales_invoice_dispatches(dispatch_id, dispatches(*, dispatch_items(*, products(name, code)))), sales_invoice_corrections(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

export interface CorrectionLineInput {
  dispatch_item_id: string | null;
  line_label?: string | null;
  qty: number | null;
  rate: number | null;
  sort_order: number;
}

export function useSaveInvoiceCorrections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      invoiceId: string;
      header: Record<string, any>;
      lines: CorrectionLineInput[];
    }) => {
      const { error } = await (supabase as any).rpc('save_invoice_corrections', {
        p_invoice_id: payload.invoiceId,
        p_header: payload.header,
        p_lines: payload.lines,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-invoice'] });
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      toast.success('Corrections saved');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save corrections'),
  });
}

export function useUnbilledDispatches(clientId: string | null, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['unbilled-dispatches', clientId, startDate, endDate],
    enabled: !!clientId && !!startDate && !!endDate,
    queryFn: async () => {
      const { data: linked } = await supabase
        .from('sales_invoice_dispatches')
        .select('dispatch_id');
      const linkedIds = new Set((linked || []).map((r: any) => r.dispatch_id));
      const { data, error } = await supabase
        .from('dispatches')
        .select('*, dispatch_items(total_qty, agreed_selling_price)')
        .eq('client_id', clientId!)
        .gte('dispatch_date', startDate)
        .lte('dispatch_date', endDate)
        .eq('is_third_party', false)
        .order('dispatch_date');
      if (error) throw error;
      return (data || []).filter((d: any) => !linkedIds.has(d.id));
    },
  });
}

export function useCreateConsolidatedInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      client_id: string;
      invoice_date: string;
      period_from: string;
      period_to: string;
      tax_percent: number;
      freight_charges: number;
      other_charges: number;
      notes?: string;
      dispatch_ids: string[];
    }) => {
      const { data: inv, error } = await supabase
        .from('sales_invoices')
        .insert({
          invoice_number: '',
          client_id: payload.client_id,
          invoice_date: payload.invoice_date,
          invoice_type: 'consolidated',
          period_from: payload.period_from,
          period_to: payload.period_to,
          tax_percent: payload.tax_percent,
          freight_charges: payload.freight_charges,
          other_charges: payload.other_charges,
          notes: payload.notes,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      const invoice: any = inv;
      // Detach existing auto-invoice links if any
      await supabase
        .from('sales_invoice_dispatches')
        .delete()
        .in('dispatch_id', payload.dispatch_ids);
      const links = payload.dispatch_ids.map((dId) => ({ invoice_id: invoice.id, dispatch_id: dId }));
      const { error: lerr } = await supabase.from('sales_invoice_dispatches').insert(links);
      if (lerr) throw lerr;
      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['unbilled-dispatches'] });
      toast.success('Consolidated invoice created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SalesInvoice> }) => {
      const { error } = await supabase.from('sales_invoices').update(patch as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['sales-invoice'] });
      toast.success('Invoice updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales_invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      toast.success('Invoice deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });
}
