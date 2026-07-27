import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrialBalanceRow {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  is_group: boolean;
  parent_id: string | null;
  opening: number;
  period_debit: number;
  period_credit: number;
  closing: number;
}

export function useTrialBalance(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['accounting', 'trial-balance', from, to],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('trial_balance', { p_from: from, p_to: to });
      if (error) throw error;
      return (data || []) as TrialBalanceRow[];
    },
  });
}

export interface PnlRow {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  amount: number;
}

export function useProfitAndLoss(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ['accounting', 'pnl', from, to],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('profit_and_loss', { p_from: from, p_to: to });
      if (error) throw error;
      return (data || []) as PnlRow[];
    },
  });
}

export interface BalanceSheetRow {
  section: string;
  account_id: string | null;
  code: string;
  name: string;
  amount: number;
}

export function useBalanceSheet(asOf: string, enabled = true) {
  return useQuery({
    queryKey: ['accounting', 'balance-sheet', asOf],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('balance_sheet', { p_as_of: asOf });
      if (error) throw error;
      return (data || []) as BalanceSheetRow[];
    },
  });
}

export interface LedgerRow {
  entry_date: string;
  voucher_id: string;
  voucher_number: string;
  voucher_type: string;
  narration: string | null;
  description: string | null;
  party_type?: string | null;
  party_id?: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

export function useGeneralLedger(accountId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ['accounting', 'general-ledger', accountId, from, to],
    enabled: !!accountId,
    queryFn: async () => {
      const [{ data, error }, { data: opening, error: opErr }] = await Promise.all([
        supabase.rpc('general_ledger', { p_account_id: accountId!, p_from: from, p_to: to }),
        supabase.rpc('account_opening_balance', { p_account_id: accountId!, p_before: from }),
      ]);
      if (error) throw error;
      if (opErr) throw opErr;
      return { rows: (data || []) as LedgerRow[], opening: Number(opening ?? 0) };
    },
  });
}

export function usePartyLedger(
  partyType: 'client' | 'supplier',
  partyId: string | undefined,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ['accounting', 'party-ledger', partyType, partyId, from, to],
    enabled: !!partyId,
    queryFn: async () => {
      const [{ data, error }, { data: opening, error: opErr }] = await Promise.all([
        supabase.rpc('party_ledger', { p_party_type: partyType, p_party_id: partyId!, p_from: from, p_to: to }),
        supabase.rpc('party_opening_balance', { p_party_type: partyType, p_party_id: partyId!, p_before: from }),
      ]);
      if (error) throw error;
      if (opErr) throw opErr;
      return { rows: (data || []) as LedgerRow[], opening: Number(opening ?? 0) };
    },
  });
}

export interface AgingRow {
  client_id?: string;
  client_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  current_0_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  total_outstanding: number;
}

export function useArAging(asOf: string) {
  return useQuery({
    queryKey: ['accounting', 'ar-aging', asOf],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ar_aging', { p_as_of: asOf });
      if (error) throw error;
      return (data || []) as AgingRow[];
    },
  });
}

export function useApAging(asOf: string) {
  return useQuery({
    queryKey: ['accounting', 'ap-aging', asOf],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ap_aging', { p_as_of: asOf });
      if (error) throw error;
      return (data || []) as AgingRow[];
    },
  });
}
