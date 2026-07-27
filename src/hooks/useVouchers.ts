import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const VOUCHER_TYPES: Record<string, string> = {
  JV: 'Journal Voucher',
  OB: 'Opening Balance',
  SI: 'Sales Invoice',
  CN: 'Credit Note',
  CR: 'Customer Receipt',
  PB: 'Purchase Bill',
  DN: 'Debit Note',
  VP: 'Vendor Payment',
  BP: 'Bank Payment',
  BR: 'Bank Receipt',
  CP: 'Cash Payment',
  TR: 'Transfer',
  PY: 'Payroll',
};

export type VoucherStatus = 'draft' | 'posted' | 'reversed';

export interface Voucher {
  id: string;
  voucher_type: string;
  voucher_number: string;
  voucher_date: string;
  status: VoucherStatus;
  narration: string | null;
  reference: string | null;
  source_table: string | null;
  source_id: string | null;
  reversal_of: string | null;
  created_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  created_at: string;
}

export interface VoucherLine {
  id: string;
  voucher_id: string;
  line_no: number;
  account_id: string;
  description: string | null;
  debit: number;
  credit: number;
  party_type: string | null;
  party_id: string | null;
  chart_of_accounts?: { code: string; name: string };
}

export function useVouchers(filters?: {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['vouchers', filters],
    queryFn: async () => {
      let q = supabase
        .from('vouchers')
        .select('*')
        .order('voucher_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (filters?.type && filters.type !== 'all') q = q.eq('voucher_type', filters.type);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status as VoucherStatus);
      if (filters?.startDate) q = q.gte('voucher_date', filters.startDate);
      if (filters?.endDate) q = q.lte('voucher_date', filters.endDate);
      if (filters?.search) q = q.or(`voucher_number.ilike.%${filters.search}%,narration.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Voucher[];
    },
  });
}

export function useVoucherLines(voucherId: string | undefined) {
  return useQuery({
    queryKey: ['voucher-lines', voucherId],
    enabled: !!voucherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voucher_lines')
        .select('*, chart_of_accounts(code, name)')
        .eq('voucher_id', voucherId!)
        .order('line_no');
      if (error) throw error;
      return (data || []) as unknown as VoucherLine[];
    },
  });
}

export interface VoucherLineInput {
  account_id: string;
  description?: string;
  debit: number;
  credit: number;
  party_type?: 'client' | 'supplier' | 'employee' | null;
  party_id?: string | null;
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      voucher_type: string;
      voucher_date: string;
      narration?: string;
      reference?: string;
      lines: VoucherLineInput[];
      post?: boolean;
    }) => {
      const { data: num, error: numErr } = await supabase.rpc('next_voucher_number', {
        _vtype: input.voucher_type,
        _vdate: input.voucher_date,
      });
      if (numErr) throw numErr;
      const { data: auth } = await supabase.auth.getUser();
      const { data: voucher, error } = await supabase
        .from('vouchers')
        .insert({
          voucher_type: input.voucher_type,
          voucher_number: num as string,
          voucher_date: input.voucher_date,
          narration: input.narration || null,
          reference: input.reference || null,
          created_by: auth.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: lineErr } = await supabase.from('voucher_lines').insert(
        input.lines.map((l, i) => ({
          voucher_id: voucher.id,
          line_no: i + 1,
          account_id: l.account_id,
          description: l.description || null,
          debit: l.debit || 0,
          credit: l.credit || 0,
          party_type: l.party_type || null,
          party_id: l.party_id || null,
        })),
      );
      if (lineErr) {
        await supabase.from('vouchers').delete().eq('id', voucher.id);
        throw lineErr;
      }
      if (input.post) {
        const { error: postErr } = await supabase.rpc('post_voucher', { p_voucher_id: voucher.id });
        if (postErr) throw postErr;
      }
      return voucher as Voucher;
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success(`Voucher ${v.voucher_number} saved`);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to save voucher'),
  });
}

export function usePostVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (voucherId: string) => {
      const { error } = await supabase.rpc('post_voucher', { p_voucher_id: voucherId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Voucher posted');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to post voucher'),
  });
}

export function useReverseVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ voucherId, reason }: { voucherId: string; reason?: string }) => {
      const { error } = await supabase.rpc('reverse_voucher', {
        p_voucher_id: voucherId,
        p_reason: reason ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      toast.success('Voucher reversed');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to reverse voucher'),
  });
}

export function useDeleteVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (voucherId: string) => {
      const { error } = await supabase.from('vouchers').delete().eq('id', voucherId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('Draft voucher deleted');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete voucher'),
  });
}
