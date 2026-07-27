import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  account_number: string | null;
  iban: string | null;
  coa_account_id: string;
  is_active: boolean;
  created_at: string;
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts').select('*').order('name');
      if (error) throw error;
      return (data || []) as BankAccount[];
    },
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; bank_name?: string; account_number?: string; iban?: string }) => {
      const { error } = await supabase.rpc('create_bank_account', {
        p_name: input.name,
        p_bank_name: input.bank_name || undefined,
        p_account_number: input.account_number || undefined,
        p_iban: input.iban || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-accounts'] });
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Bank account created (GL ledger added under Bank Accounts)');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create bank account'),
  });
}

export interface ChequeRegisterRow {
  direction: 'received' | 'issued';
  source_id: string;
  doc_number: string;
  entry_date: string;
  cheque_number: string | null;
  cheque_date: string | null;
  cheque_status: string | null;
  amount: number;
  party_name: string;
  bank_account_name: string | null;
}

export function useChequeRegister() {
  return useQuery({
    queryKey: ['cheque-register'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cheque_register')
        .select('*')
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ChequeRegisterRow[];
    },
  });
}
