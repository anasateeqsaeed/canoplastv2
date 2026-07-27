import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FiscalYear {
  id: string;
  year_label: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  accounting_periods?: AccountingPeriod[];
}

export interface AccountingPeriod {
  id: string;
  fiscal_year_id: string;
  period_no: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
}

export function useFiscalYears() {
  return useQuery({
    queryKey: ['fiscal-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*, accounting_periods(*)')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown as FiscalYear[]).map((fy) => ({
        ...fy,
        accounting_periods: (fy.accounting_periods || []).sort((a, b) => a.period_no - b.period_no),
      }));
    },
  });
}

export function useSetPeriodStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, status }: { periodId: string; status: 'open' | 'closed' }) => {
      const { error } = await supabase.from('accounting_periods').update({ status }).eq('id', periodId);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success(status === 'closed' ? 'Period locked' : 'Period re-opened');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update period'),
  });
}

export function useCreateFiscalYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (year: number) => {
      const { data: fy, error } = await supabase
        .from('fiscal_years')
        .insert({
          year_label: `FY ${year}`,
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`,
        })
        .select()
        .single();
      if (error) throw error;
      const months = Array.from({ length: 12 }, (_, i) => {
        const start = new Date(Date.UTC(year, i, 1));
        const end = new Date(Date.UTC(year, i + 1, 0));
        return {
          fiscal_year_id: fy.id,
          period_no: i + 1,
          name: `${start.toLocaleString('en', { month: 'short', timeZone: 'UTC' })} ${year}`,
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
        };
      });
      const { error: pErr } = await supabase.from('accounting_periods').insert(months);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Fiscal year created with 12 monthly periods');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create fiscal year'),
  });
}
