import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Supplier = Tables<'suppliers'>;
export type SupplierInsert = TablesInsert<'suppliers'>;
export type SupplierUpdate = TablesUpdate<'suppliers'>;

export type SupplierType = 'vendor' | 'job_work' | 'cash_purchase' | 'customer_provided';
export type LaborRateUnit = 'per_kg' | 'per_piece' | 'per_hour';

// Extended supplier with related client data
export interface SupplierWithClient extends Supplier {
  linked_client?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export function useSuppliers(type?: SupplierType) {
  return useQuery({
    queryKey: ['suppliers', type],
    queryFn: async () => {
      let query = supabase
        .from('suppliers')
        .select(`
          *,
          linked_client:clients!suppliers_linked_client_id_fkey(id, name, code)
        `)
        .order('created_at', { ascending: false });
      
      if (type) {
        query = query.eq('supplier_type', type);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as SupplierWithClient[];
    },
  });
}

export function useSuppliersByType(type: SupplierType) {
  return useSuppliers(type);
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (supplier: SupplierInsert) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add supplier: ' + error.message);
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: SupplierUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update supplier: ' + error.message);
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete supplier: ' + error.message);
    },
  });
}
