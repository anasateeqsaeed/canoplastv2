import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type UnitOfMeasure = Tables<'units_of_measure'>;

export function useUnitsOfMeasure() {
  return useQuery({
    queryKey: ['units_of_measure'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data as UnitOfMeasure[]) || [];
    },
  });
}

export interface CreateUnitData {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

// Hook to create a new unit of measure (used by GRN quick-add)
export function useCreateUnitOfMeasure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUnitData) => {
      const { data: result, error } = await supabase
        .from('units_of_measure')
        .insert({
          code: data.code.toLowerCase().trim(),
          name: data.name.trim(),
          description: data.description?.trim() || null,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return result as UnitOfMeasure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units_of_measure'] });
      toast.success('Unit created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create unit'),
  });
}

// Hook to preview the next GRN number (matches next_doc_number('grn', 'GRN') format)
export function useNextGRNNumber() {
  return useQuery({
    queryKey: ['next-grn-number'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doc_counters')
        .select('last_number')
        .eq('doc_type', 'grn')
        .maybeSingle();
      if (error) throw error;

      const next = (data?.last_number ?? 0) + 1;
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      return `GRN-${yy}${mm}-${String(next).padStart(4, '0')}`;
    },
    staleTime: 0,
  });
}

export function useUpsertUnitOfMeasure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<UnitOfMeasure> & { code: string; name: string }) => {
      const { id, ...rest } = row as any;
      if (id) {
        const { error } = await supabase.from('units_of_measure').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('units_of_measure').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units_of_measure'] });
      toast.success('Unit of measure saved');
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });
}
