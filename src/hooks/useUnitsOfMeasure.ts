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
