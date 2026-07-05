import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StoreRequisition {
  id: string;
  requisition_number: string;
  requisition_date: string;
  job_id: string | null;
  department_id: string | null;
  machine_id: string | null;
  shift: string | null;
  planned_production_qty: number | null;
  status: string;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  remarks: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined data
  job?: {
    job_number: string;
    product_code: string;
    product_name: string;
    client_id: string;
  } | null;
  department?: {
    name: string;
    code: string;
  } | null;
  machine?: {
    machine_id: string;
  } | null;
}

export interface RequisitionItem {
  id: string;
  requisition_id: string;
  material_id: string | null;
  material_role: string | null;
  required_qty_kg: number;
  available_qty_kg: number | null;
  issued_qty_kg: number | null;
  source_type: string | null;
  source_location_id: string | null;
  status: string | null;
  remarks: string | null;
  created_at: string | null;
  // Adjustment tracking fields
  original_qty_kg: number | null;
  adjusted_qty_kg: number | null;
  adjustment_reason: string | null;
  adjusted_by: string | null;
  adjusted_at: string | null;
  // Joined data
  material?: {
    code: string;
    name: string;
    unit: string | null;
  } | null;
}

export interface CreateRequisitionData {
  job_id?: string | null;
  department_id?: string | null;
  machine_id?: string | null;
  shift?: string | null;
  planned_production_qty?: number | null;
  requested_by?: string | null;
  remarks?: string | null;
}

export interface CreateRequisitionItemData {
  requisition_id: string;
  material_id: string;
  material_role?: string;
  required_qty_kg: number;
  available_qty_kg?: number;
  source_type?: string;
  source_location_id?: string | null;
  remarks?: string;
}

export function useStoreRequisitions(dateFilter?: string, statusFilter?: string) {
  return useQuery({
    queryKey: ['store_requisitions', dateFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('store_requisitions')
        .select(`
          *,
          department:departments(name, code)
        `)
        // job:production_jobs / machine:machines joins reconnect in Phase 5
        .order('created_at', { ascending: false });

      if (dateFilter) {
        query = query.eq('requisition_date', dateFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StoreRequisition[];
    },
  });
}

export function useRequisitionItems(requisitionId: string | null) {
  return useQuery({
    queryKey: ['requisition_items', requisitionId],
    queryFn: async () => {
      if (!requisitionId) return [];
      const { data, error } = await supabase
        .from('requisition_items')
        .select(`
          *,
          material:materials(code, name, unit)
        `)
        .eq('requisition_id', requisitionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as RequisitionItem[];
    },
    enabled: !!requisitionId,
  });
}

export function useCreateRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRequisitionData) => {
      // Generate requisition number via RPC (was a DB trigger in v1)
      const { data: reqNumber, error: numErr } = await supabase.rpc('next_doc_number', {
        _doc_type: 'store_requisition',
        _prefix: 'REQ',
      });
      if (numErr) throw numErr;

      const { data: result, error } = await supabase
        .from('store_requisitions')
        .insert([{ ...data, requisition_number: reqNumber as string }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_requisitions'] });
      toast.success('Requisition created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create requisition: ${error.message}`);
    },
  });
}

export function useCreateRequisitionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRequisitionItemData) => {
      const { data: result, error } = await supabase
        .from('requisition_items')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requisition_items', variables.requisition_id] });
      toast.success('Item added to requisition');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });
}

export function useUpdateRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<StoreRequisition>) => {
      const { data, error } = await supabase
        .from('store_requisitions')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_requisitions'] });
      toast.success('Requisition updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useUpdateRequisitionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, requisitionId, ...updates }: { id: string; requisitionId: string } & Partial<RequisitionItem>) => {
      const { data, error } = await supabase
        .from('requisition_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, requisitionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['requisition_items', result.requisitionId] });
      toast.success('Item updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}

export function useDeleteRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_requisitions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_requisitions'] });
      toast.success('Requisition deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

export function usePendingRequisitionsCount() {
  return useQuery({
    queryKey: ['store_requisitions', 'pending_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('store_requisitions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'approved']);

      if (error) throw error;
      return count || 0;
    },
  });
}
