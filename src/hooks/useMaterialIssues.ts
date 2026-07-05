import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaterialIssue {
  id: string;
  issue_number: string;
  issue_date: string;
  from_location_id: string | null;
  material_lot_id: string | null;
  to_department: string;
  quantity_issued: number;
  dispatched_qty: number | null;
  received_qty: number | null;
  shortage_reason: string | null;
  unit: string;
  status: string;
  purpose: string | null;
  job_id: string | null;
  issued_by: string | null;
  received_by: string | null;
  received_at: string | null;
  picking_completed_at: string | null;
  picking_by: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  from_location?: {
    location_code: string;
    location_name: string;
  };
  material_lot?: {
    lot_number: string;
    remaining_qty: number;
    material: {
      name: string;
      code: string;
    };
  };
}

export interface MaterialIssueInput {
  from_location_id?: string;
  material_lot_id?: string;
  to_department: string;
  quantity_issued: number;
  unit?: string;
  purpose?: string;
  job_id?: string;
  issued_by?: string;
  remarks?: string;
}

export function useMaterialIssues(status?: string, dateFrom?: string, dateTo?: string) {
  const queryClient = useQueryClient();

  const { data: issues = [], isLoading, error } = useQuery({
    queryKey: ['material-issues', status, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('material_issues')
        .select(`
          *,
          from_location:storage_locations!from_location_id(location_code, location_name),
          material_lot:material_lots!material_lot_id(
            lot_number,
            remaining_qty,
            material:materials!material_id(name, code)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      if (dateFrom) {
        query = query.gte('issue_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('issue_date', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaterialIssue[];
    },
  });

  const createIssue = useMutation({
    mutationFn: async (input: MaterialIssueInput) => {
      // Generate issue number via RPC (was a DB trigger in v1)
      const { data: issueNumber, error: numErr } = await supabase.rpc('next_doc_number', {
        _doc_type: 'material_issue',
        _prefix: 'ISS',
      });
      if (numErr) throw numErr;

      // issued_by is a uuid in v2 — record the logged-in user
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('material_issues')
        .insert({
          issue_number: issueNumber as string,
          from_location_id: input.from_location_id,
          material_lot_id: input.material_lot_id,
          to_department: input.to_department,
          quantity_issued: input.quantity_issued,
          unit: input.unit || 'kg',
          purpose: input.purpose,
          job_id: input.job_id,
          issued_by: input.issued_by || userData?.user?.id || null,
          remarks: input.remarks,
          status: 'issued',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-issues'] });
      toast.success('Material issue slip created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create issue: ${error.message}`);
    },
  });

  const updateIssueStatus = useMutation({
    mutationFn: async ({ id, status, ...updates }: { 
      id: string; 
      status: string; 
      picking_by?: string; 
      received_by?: string;
      dispatched_qty?: number;
      received_qty?: number;
      shortage_reason?: string;
    }) => {
      const updateData: Record<string, any> = { status };
      
      if (status === 'picking' && updates.picking_by) {
        updateData.picking_by = updates.picking_by;
      }
      if (status === 'dispatched') {
        updateData.picking_completed_at = new Date().toISOString();
        if (updates.dispatched_qty !== undefined) {
          updateData.dispatched_qty = updates.dispatched_qty;
        }
        if (updates.shortage_reason) {
          updateData.shortage_reason = updates.shortage_reason;
        }
      }
      if (status === 'received') {
        updateData.received_at = new Date().toISOString();
        if (updates.received_by) {
          updateData.received_by = updates.received_by;
        }
        if (updates.received_qty !== undefined) {
          updateData.received_qty = updates.received_qty;
        }
        if (updates.shortage_reason) {
          updateData.shortage_reason = updates.shortage_reason;
        }
      }

      const { data, error } = await supabase
        .from('material_issues')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-issues'] });
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      toast.success(`Issue status updated to ${variables.status}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update issue: ${error.message}`);
    },
  });

  const deleteIssue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('material_issues')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-issues'] });
      toast.success('Issue deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete issue: ${error.message}`);
    },
  });

  // Get pending issues count
  const pendingCount = issues.filter(i => ['issued', 'picking'].includes(i.status)).length;

  return {
    issues,
    isLoading,
    error,
    pendingCount,
    createIssue,
    updateIssueStatus,
    deleteIssue,
  };
}
