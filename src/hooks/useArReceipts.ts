import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ArReceipt {
  id: string;
  receipt_number: string;
  client_id: string;
  receipt_date: string;
  amount: number;
  mode: 'cash' | 'bank' | 'cheque';
  bank_account_id: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
  cheque_status: 'pending' | 'cleared' | 'bounced' | null;
  reference: string | null;
  notes: string | null;
  voucher_id: string | null;
  created_at: string;
  clients?: { name: string; code: string };
  ar_receipt_allocations?: Array<{ invoice_id: string; amount: number }>;
}

export function useArReceipts(filters?: { clientId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['ar-receipts', filters],
    queryFn: async () => {
      let q = supabase
        .from('ar_receipts')
        .select('*, clients(name, code), ar_receipt_allocations(invoice_id, amount)')
        .order('receipt_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (filters?.clientId) q = q.eq('client_id', filters.clientId);
      if (filters?.startDate) q = q.gte('receipt_date', filters.startDate);
      if (filters?.endDate) q = q.lte('receipt_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ArReceipt[];
    },
  });
}

/** Issued invoices of a client with an outstanding balance (for allocation). */
export function useOutstandingInvoices(clientId: string | undefined) {
  return useQuery({
    queryKey: ['outstanding-invoices', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, invoice_date, total_amount, amount_paid, payment_status')
        .eq('client_id', clientId!)
        .eq('status', 'issued')
        .neq('payment_status', 'paid')
        .order('invoice_date');
      if (error) throw error;
      return (data || []).filter((i) => Number(i.total_amount) - Number(i.amount_paid) > 0.005);
    },
  });
}

export interface ReceiptInput {
  client_id: string;
  receipt_date: string;
  amount: number;
  mode: 'cash' | 'bank' | 'cheque';
  bank_account_id?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  reference?: string | null;
  notes?: string | null;
  allocations: Array<{ invoice_id: string; amount: number }>;
}

export function useCreateArReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReceiptInput) => {
      const { data, error } = await supabase.rpc('create_ar_receipt', {
        p_client_id: input.client_id,
        p_receipt_date: input.receipt_date,
        p_amount: input.amount,
        p_mode: input.mode,
        p_bank_account_id: input.bank_account_id ?? undefined,
        p_cheque_number: input.cheque_number ?? undefined,
        p_cheque_date: input.cheque_date ?? undefined,
        p_reference: input.reference ?? undefined,
        p_notes: input.notes ?? undefined,
        p_allocations: input.allocations,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ar-receipts'] });
      qc.invalidateQueries({ queryKey: ['outstanding-invoices'] });
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Receipt recorded and posted to GL');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to record receipt'),
  });
}

export function useMarkArChequeBounced() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (receiptId: string) => {
      const { error } = await supabase.rpc('mark_ar_cheque_bounced', { p_receipt_id: receiptId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ar-receipts'] });
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Cheque marked bounced — GL entry reversed');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to mark cheque bounced'),
  });
}

export function useUpdateChequeStatus(table: 'ar_receipts' | 'ap_payments') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'cleared' }) => {
      const { error } = await supabase.from(table).update({ cheque_status: status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ar-receipts'] });
      qc.invalidateQueries({ queryKey: ['ap-payments'] });
      qc.invalidateQueries({ queryKey: ['cheque-register'] });
      toast.success('Cheque marked cleared');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update cheque'),
  });
}

/** Issued invoices not yet posted to the GL, with a bulk post action. */
export function useUnpostedInvoices() {
  return useQuery({
    queryKey: ['accounting', 'unposted-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, invoice_date, client_id, total_amount, clients(name)')
        .eq('status', 'issued')
        .is('gl_voucher_id', null)
        .order('invoice_date');
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        invoice_number: string;
        invoice_date: string;
        client_id: string;
        total_amount: number;
        clients?: { name: string };
      }>;
    },
  });
}

export function usePostInvoiceToGl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase.rpc('post_sales_invoice_to_gl', { p_invoice_id: invoiceId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting'] });
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to post invoice'),
  });
}
