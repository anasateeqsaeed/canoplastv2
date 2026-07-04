import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmployeeType {
  id: string;
  code: string;
  name: string;
  category: 'factory' | 'office';
  sort_order: number;
  is_active: boolean;
  default_work_pattern_id: string | null;
  created_at: string;
  updated_at: string;
}

export type EmployeeTypeInput = Partial<Omit<EmployeeType, 'id' | 'created_at' | 'updated_at'>>;

export function useEmployeeTypes(opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['employee_types', opts?.includeInactive ?? false],
    queryFn: async () => {
      let q = supabase.from('employee_types' as any).select('*').order('sort_order', { ascending: true });
      if (!opts?.includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as EmployeeType[];
    },
  });
}

export function useCreateEmployeeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeTypeInput) => {
      const payload: any = {
        code: (input.code || '').trim().toUpperCase(),
        name: (input.name || '').trim(),
        category: input.category || 'factory',
        sort_order: input.sort_order ?? 100,
        is_active: input.is_active ?? true,
        default_work_pattern_id: input.default_work_pattern_id ?? null,
      };
      if (!payload.code || !payload.name) throw new Error('Code and name are required');
      const { data, error } = await supabase.from('employee_types' as any).insert(payload).select().single();
      if (error) throw error;
      return data as unknown as EmployeeType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_types'] });
      toast.success('Employee type added');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add type'),
  });
}

export function useUpdateEmployeeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: EmployeeTypeInput & { id: string }) => {
      const { data, error } = await supabase.from('employee_types' as any).update(input as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_types'] });
      toast.success('Employee type updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });
}

export function useDeleteEmployeeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employee_types' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_types'] });
      toast.success('Employee type deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete (may be in use)'),
  });
}
