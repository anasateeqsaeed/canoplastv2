import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// NOTE: v1's useCostingMasters.ts also had hooks for costing_rates, packing_sizes,
// and transport_settings. Those tables don't exist yet in v2 (they land in a later
// Costing/Price-Calculator phase), so only the delivery-terms and payment-terms
// pieces — which back the `delivery_terms` / `payment_terms` tables that already
// exist — are ported here.

export interface DeliveryTerm {
  id: string;
  name: string;
  packing_cost_per_kg: number;
  delivery_cost_per_kg: number;
  notes: string | null;
  is_active: boolean;
}

export interface PaymentTerm {
  id: string;
  name: string;
  price_adjust_pct: number;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
}

export function useDeliveryTerms() {
  return useQuery({
    queryKey: ['delivery_terms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_terms')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data as unknown as DeliveryTerm[]) || [];
    },
  });
}

export function usePaymentTerms() {
  return useQuery({
    queryKey: ['payment_terms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_terms')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data as unknown as PaymentTerm[]) || [];
    },
  });
}

export function useUpsertDeliveryTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<DeliveryTerm> & { name: string }) => {
      const { id, ...rest } = row as any;
      if (id) {
        const { error } = await supabase.from('delivery_terms').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('delivery_terms').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery_terms'] });
      toast.success('Delivery term saved');
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });
}

export function useUpsertPaymentTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PaymentTerm> & { name: string }) => {
      const { id, ...rest } = row as any;
      if (id) {
        const { error } = await supabase.from('payment_terms').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_terms').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment_terms'] });
      toast.success('Payment term saved');
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });
}
