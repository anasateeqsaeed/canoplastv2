import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Store {
  id: string;
  code: string;
  name: string;
  description: string | null;
  floor_location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreInput {
  code: string;
  name: string;
  description?: string;
  floor_location?: string;
  is_active?: boolean;
}

export function useStores() {
  const queryClient = useQueryClient();

  const { data: stores = [], isLoading, error } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Store[];
    },
  });

  const activeStores = stores.filter(s => s.is_active);

  const createStore = useMutation({
    mutationFn: async (input: StoreInput) => {
      const { data, error } = await supabase
        .from('stores')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Store created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create store: ${error.message}`);
    },
  });

  const updateStore = useMutation({
    mutationFn: async ({ id, ...input }: Partial<StoreInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('stores')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Store updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update store: ${error.message}`);
    },
  });

  const deleteStore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Store deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete store: ${error.message}`);
    },
  });

  return {
    stores,
    activeStores,
    isLoading,
    error,
    createStore,
    updateStore,
    deleteStore,
  };
}

// Hook to get racks for a specific store
export function useStoreRacks(storeId: string | undefined) {
  const { data: racks = [], isLoading, error } = useQuery({
    queryKey: ['store-racks', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('storage_locations')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('location_code');
      
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const availableRacks = racks.filter(rack => 
    (rack.capacity_kg || 0) > (rack.current_stock_kg || 0)
  );

  return {
    racks,
    availableRacks,
    isLoading,
    error,
  };
}

// Hook to get material lots stored in a specific rack
export function useRackMaterialLots(rackId: string | undefined) {
  const { data: lots = [], isLoading, error } = useQuery({
    queryKey: ['rack-material-lots', rackId],
    queryFn: async () => {
      if (!rackId) return [];
      
      const { data, error } = await supabase
        .from('material_lots')
        .select(`
          id,
          lot_number,
          remaining_qty,
          received_date,
          grn_number,
          material:materials (
            id,
            name,
            code
          )
        `)
        .eq('storage_location_id', rackId)
        .gt('remaining_qty', 0)
        .order('received_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!rackId,
  });

  const totalQty = lots.reduce((sum, lot) => sum + (lot.remaining_qty || 0), 0);

  return {
    lots,
    totalQty,
    isLoading,
    error,
  };
}
