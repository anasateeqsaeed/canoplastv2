import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaterialReturn {
  id: string;
  return_number: string;
  return_date: string;
  from_department: string;
  from_machine_id: string | null;
  to_location_id: string | null;
  to_department: string | null;
  quantity_kg: number;
  return_type: string;
  status: string;
  shift: string | null;
  returned_by: string | null;
  received_by: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  to_location?: {
    location_code: string;
    location_name: string;
  };
  from_machine?: {
    machine_id: string;
  };
}

export interface MaterialReturnInput {
  from_department: string;
  from_machine_id?: string;
  to_location_id?: string;
  to_department?: string;
  quantity_kg: number;
  return_type: string;
  shift?: string;
  returned_by?: string;
  remarks?: string;
}

export const RETURN_TYPES = [
  { value: 'unused_material', label: 'Unused Material' },
  { value: 'regrind', label: 'Regrind' },
  { value: 'floor_sweep', label: 'Floor Sweep' },
  { value: 'leftover_compound', label: 'Leftover Compound' },
  { value: 'defective', label: 'Defective Material' },
];

export function useMaterialReturns(status?: string, dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();

  const { data: returns = [], isLoading, error } = useQuery({
    queryKey: ['material-returns', status, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('material_returns')
        .select(`
          *,
          to_location:storage_locations!to_location_id(location_code, location_name)
        `)
        // from_machine:machines join reconnects in Phase 5
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      if (dateFrom) {
        query = query.gte('return_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('return_date', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialReturn[];
    },
  });

  const createReturn = useMutation({
    mutationFn: async (input: MaterialReturnInput) => {
      // Generate return number via RPC (was a DB trigger in v1)
      const { data: returnNumber, error: numErr } = await supabase.rpc('next_doc_number', {
        _doc_type: 'material_return',
        _prefix: 'RET',
      });
      if (numErr) throw numErr;

      // returned_by is a uuid in v2 — record the logged-in user
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('material_returns')
        .insert({
          return_number: returnNumber as string,
          from_department: input.from_department,
          from_machine_id: input.from_machine_id,
          to_location_id: input.to_location_id,
          to_department: input.to_department,
          quantity_kg: input.quantity_kg,
          return_type: input.return_type,
          shift: input.shift,
          returned_by: input.returned_by || userData?.user?.id || null,
          remarks: input.remarks,
          status: 'pending',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-returns'] });
      toast.success('Material return slip created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create return: ${error.message}`);
    },
  });

  const updateReturnStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string; received_by?: string }) => {
      const updateData: Record<string, any> = { status };

      if (status === 'received') {
        // received_by is a uuid in v2 — record the logged-in user
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) updateData.received_by = userData.user.id;
      }

      const { data, error } = await supabase
        .from('material_returns')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-returns'] });
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success(`Return status updated to ${variables.status}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update return: ${error.message}`);
    },
  });

  const deleteReturn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_returns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-returns'] });
      toast.success('Return deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete return: ${error.message}`);
    },
  });

  // Get pending returns count
  const pendingCount = returns.filter(r => r.status === 'pending').length;

  return {
    returns,
    isLoading,
    error,
    pendingCount,
    createReturn,
    updateReturnStatus,
    deleteReturn,
  };
}
