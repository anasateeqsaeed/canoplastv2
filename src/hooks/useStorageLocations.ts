import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StorageLocation {
  id: string;
  location_code: string;
  location_name: string;
  zone: string;
  sub_zone: string | null;
  rack_number: string | null;
  row_number: string | null;
  bin_number: string | null;
  capacity_kg: number | null;
  current_stock_kg: number | null;
  material_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorageLocationInput {
  location_code: string;
  location_name: string;
  zone: string;
  sub_zone?: string;
  rack_number?: string;
  row_number?: string;
  bin_number?: string;
  capacity_kg?: number;
  material_type?: string;
  is_active?: boolean;
}

export function useStorageLocations(zone?: string, subZone?: string) {
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading, error } = useQuery({
    queryKey: ['storage-locations', zone, subZone],
    queryFn: async () => {
      let query = supabase
        .from('storage_locations')
        .select('*')
        .order('location_code');
      
      if (zone) {
        query = query.eq('zone', zone);
      }
      if (subZone) {
        query = query.eq('sub_zone', subZone);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StorageLocation[];
    },
  });

  const createLocation = useMutation({
    mutationFn: async (input: StorageLocationInput) => {
      const { data, error } = await supabase
        .from('storage_locations')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success('Storage location created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create location: ${error.message}`);
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<StorageLocationInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('storage_locations')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success('Storage location updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update location: ${error.message}`);
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('storage_locations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success('Storage location deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete location: ${error.message}`);
    },
  });

  // Get zone summary
  const { data: zoneSummary = [] } = useQuery({
    queryKey: ['storage-locations-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_locations')
        .select('zone, sub_zone, capacity_kg, current_stock_kg')
        .eq('is_active', true);
      if (error) throw error;

      // Aggregate by zone and sub_zone
      const summary = new Map<string, { zone: string; sub_zone: string | null; total_capacity: number; total_stock: number; count: number }>();
      
      data.forEach((loc: any) => {
        const key = `${loc.zone}-${loc.sub_zone || 'general'}`;
        const existing = summary.get(key);
        if (existing) {
          existing.total_capacity += loc.capacity_kg || 0;
          existing.total_stock += loc.current_stock_kg || 0;
          existing.count += 1;
        } else {
          summary.set(key, {
            zone: loc.zone,
            sub_zone: loc.sub_zone,
            total_capacity: loc.capacity_kg || 0,
            total_stock: loc.current_stock_kg || 0,
            count: 1,
          });
        }
      });

      return Array.from(summary.values());
    },
  });

  // Get available locations (with capacity)
  const getAvailableLocations = (forZone?: string, forSubZone?: string) => {
    return locations.filter(loc => {
      const hasCapacity = (loc.capacity_kg || 0) > (loc.current_stock_kg || 0);
      const zoneMatch = !forZone || loc.zone === forZone;
      const subZoneMatch = !forSubZone || loc.sub_zone === forSubZone;
      return hasCapacity && loc.is_active && zoneMatch && subZoneMatch;
    });
  };

  return {
    locations,
    isLoading,
    error,
    zoneSummary,
    createLocation,
    updateLocation,
    deleteLocation,
    getAvailableLocations,
  };
}
