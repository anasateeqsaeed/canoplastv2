import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApBill {
  id: string;
  bill_number: string;
  supplier_id: string;
  bill_date: string;
  due_date: string | null;
  vendor_bill_no: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  status: 'draft' | 'posted' | 'cancelled';
  narration: string | null;
  voucher_id: string | null;
  created_at: string;
  suppliers?: { name: string; code: string };
  ap_bill_lines?: Array<{ id: string; account_id: string; description: string | null; amount: number }>;
}

export function useApBills(filters?: { supplierId?: string; status?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['ap-bills', filters],
    queryFn: async () => {
      let q = supabase
        .from('ap_bills')
        .select('*, suppliers(name, code), ap_bill_lines(id, account_id, description, amount)')
        .order('bill_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (filters?.supplierId) q = q.eq('supplier_id', filters.supplierId);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.startDate) q = q.gte('bill_date', filters.startDate);
      if (filters?.endDate) q = q.lte('bill_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ApBill[];
    },
  });
}

export interface BillInput {
  supplier_id: string;
  bill_date: string;
  due_date?: string | null;
  vendor_bill_no?: string | null;
  tax_amount: number;
  narration?: string | null;
  lines: Array<{ account_id: string; description?: string; amount: number }>;
}

export function useCreateApBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ post, ...input }: BillInput & { post?: boolean }) => {
      const subtotal = input.lines.reduce((s, l) => s + (l.amount || 0), 0);
      const { data: num, error: numErr } = await supabase.rpc('next_voucher_number', {
        _vtype: 'PB',
        _vdate: input.bill_date,
      });
      if (numErr) throw numErr;
      const { data: auth } = await supabase.auth.getUser();
      const { data: bill, error } = await supabase
        .from('ap_bills')
        .insert({
          bill_number: num as string,
          supplier_id: input.supplier_id,
          bill_date: input.bill_date,
          due_date: input.due_date || null,
          vendor_bill_no: input.vendor_bill_no || null,
          subtotal,
          tax_amount: input.tax_amount || 0,
          total_amount: subtotal + (input.tax_amount || 0),
          narration: input.narration || null,
          created_by: auth.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: lineErr } = await supabase.from('ap_bill_lines').insert(
        input.lines.map((l) => ({
          bill_id: bill.id,
          account_id: l.account_id,
          description: l.description || null,
          amount: l.amount,
        })),
      );
      if (lineErr) {
        await supabase.from('ap_bills').delete().eq('id', bill.id);
        throw lineErr;
      }
      if (post) {
        const { error: postErr } = await supabase.rpc('post_ap_bill', { p_bill_id: bill.id });
        if (postErr) throw postErr;
      }
      return bill as ApBill;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['ap-bills'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success(`Bill ${b.bill_number} saved`);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save bill'),
  });
}

export function usePostApBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase.rpc('post_ap_bill', { p_bill_id: billId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-bills'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Bill posted to GL');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to post bill'),
  });
}

export function useDeleteApBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase.from('ap_bills').delete().eq('id', billId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-bills'] });
      toast.success('Draft bill deleted');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete bill'),
  });
}

export interface ApPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  payment_date: string;
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
  suppliers?: { name: string; code: string };
  ap_payment_allocations?: Array<{ bill_id: string; amount: number }>;
}

export function useApPayments(filters?: { supplierId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['ap-payments', filters],
    queryFn: async () => {
      let q = supabase
        .from('ap_payments')
        .select('*, suppliers(name, code), ap_payment_allocations(bill_id, amount)')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (filters?.supplierId) q = q.eq('supplier_id', filters.supplierId);
      if (filters?.startDate) q = q.gte('payment_date', filters.startDate);
      if (filters?.endDate) q = q.lte('payment_date', filters.endDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ApPayment[];
    },
  });
}

/** Posted bills of a supplier with an outstanding balance (for allocation). */
export function useOutstandingBills(supplierId: string | undefined) {
  return useQuery({
    queryKey: ['outstanding-bills', supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ap_bills')
        .select('id, bill_number, bill_date, due_date, total_amount, amount_paid, payment_status')
        .eq('supplier_id', supplierId!)
        .eq('status', 'posted')
        .neq('payment_status', 'paid')
        .order('bill_date');
      if (error) throw error;
      return (data || []).filter((b) => Number(b.total_amount) - Number(b.amount_paid) > 0.005);
    },
  });
}

export interface PaymentInput {
  supplier_id: string;
  payment_date: string;
  amount: number;
  mode: 'cash' | 'bank' | 'cheque';
  bank_account_id?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  reference?: string | null;
  notes?: string | null;
  allocations: Array<{ bill_id: string; amount: number }>;
}

export function useCreateApPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      const { data, error } = await supabase.rpc('create_ap_payment', {
        p_supplier_id: input.supplier_id,
        p_payment_date: input.payment_date,
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
      qc.invalidateQueries({ queryKey: ['ap-payments'] });
      qc.invalidateQueries({ queryKey: ['ap-bills'] });
      qc.invalidateQueries({ queryKey: ['outstanding-bills'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Payment recorded and posted to GL');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to record payment'),
  });
}

export function useMarkApChequeBounced() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.rpc('mark_ap_cheque_bounced', { p_payment_id: paymentId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-payments'] });
      qc.invalidateQueries({ queryKey: ['ap-bills'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Cheque marked bounced — GL entry reversed');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to mark cheque bounced'),
  });
}
