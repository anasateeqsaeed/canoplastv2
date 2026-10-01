import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type GateMovement = Tables<'gate_movements'>;
export type GateMovementInsert = TablesInsert<'gate_movements'>;

// A gate movement joined with the party (vendor / customer) it references.
export interface GateMovementWithParty extends GateMovement {
  vendor?: { id: string; name: string; code: string } | null;
  customer?: { id: string; name: string; code: string } | null;
}

/**
 * Fetch gate movements, optionally filtered by direction ('in' | 'out').
 * The Material Gate Out screen queries direction = 'out'.
 */
export function useGateMovements(direction?: 'in' | 'out') {
  return useQuery({
    queryKey: ['gate_movements', direction ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('gate_movements')
        .select(
          '*, vendor:suppliers(id, name, code), customer:clients(id, name, code)'
        )
        .order('movement_date', { ascending: false })
        .order('movement_time', { ascending: false });

      if (direction) {
        query = query.eq('direction', direction);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GateMovementWithParty[];
    },
  });
}

export function useCreateGateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: GateMovementInsert) => {
      // Stamp created_by from auth so we keep an audit trail of who logged the gate pass.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload: GateMovementInsert = {
        ...movement,
        created_by: user?.id ?? null,
      };

      const { data, error } = await supabase
        .from('gate_movements')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate_movements'] });
      toast.success('Gate out entry recorded');
    },
    onError: (error) => {
      toast.error('Failed to record gate out: ' + error.message);
    },
  });
}

export function useUpdateGateMovementStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: TablesUpdate<'gate_movements'> = { status };
      // When a returnable item comes back in, stamp the return time.
      if (status === 'returned') updates.returned_at = new Date().toISOString();

      const { error } = await supabase
        .from('gate_movements')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate_movements'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}
