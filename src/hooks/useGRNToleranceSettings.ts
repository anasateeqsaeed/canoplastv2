import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GRNToleranceSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export function useGRNToleranceSettings() {
  return useQuery({
    queryKey: ['grn-tolerance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grn_tolerance_settings')
        .select('*');
      
      if (error) throw error;
      
      // Convert to key-value map
      const settings: Record<string, any> = {};
      (data || []).forEach((item: any) => {
        settings[item.setting_key] = item.setting_value;
      });
      
      return {
        defaultTolerancePercent: Number(settings['default_tolerance_percent']) || 5,
        allowedTolerances: (settings['allowed_tolerances'] || [0, 5, 10, 15, 20]) as number[],
        raw: data as GRNToleranceSetting[],
      };
    },
  });
}

export function useUpdateGRNToleranceSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data, error } = await supabase
        .from('grn_tolerance_settings')
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn-tolerance-settings'] });
      toast.success('Setting updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update setting: ' + error.message);
    },
  });
}

// Utility function to calculate max receivable quantity
export function calculateMaxReceivable(
  orderedQty: number,
  tolerancePercent: number,
  allowExtra: boolean,
  alreadyReceived: number
): number {
  if (!allowExtra) {
    return orderedQty - alreadyReceived;
  }
  const maxTotal = orderedQty * (1 + tolerancePercent / 100);
  return Math.max(0, maxTotal - alreadyReceived);
}

// Hook to get material tolerance override
export function useMaterialToleranceCheck(materialId: string | undefined) {
  return useQuery({
    queryKey: ['material-tolerance-check', materialId],
    queryFn: async () => {
      if (!materialId) return { denyExtraTolerance: false };
      
      const { data, error } = await supabase
        .from('materials')
        .select('deny_extra_tolerance')
        .eq('id', materialId)
        .single();
      
      if (error) return { denyExtraTolerance: false };
      return { denyExtraTolerance: data?.deny_extra_tolerance || false };
    },
    enabled: !!materialId,
  });
}
