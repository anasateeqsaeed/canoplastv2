import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface CoaAccount {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  parent_id: string | null;
  is_group: boolean;
  system_key: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useChartOfAccounts() {
  return useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code');
      if (error) throw error;
      return (data || []) as CoaAccount[];
    },
  });
}

export interface AccountInput {
  code: string;
  name: string;
  account_type: AccountType;
  parent_id: string | null;
  is_group: boolean;
  description?: string | null;
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AccountInput) => {
      const { error } = await supabase.from('chart_of_accounts').insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account created');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create account'),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<AccountInput> & { id: string; is_active?: boolean }) => {
      const { error } = await supabase.from('chart_of_accounts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update account'),
  });
}
