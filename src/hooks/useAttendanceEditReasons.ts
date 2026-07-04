import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AttendanceEditReason {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

export function useAttendanceEditReasons(activeOnly = true) {
  return useQuery({
    queryKey: ['attendance_edit_reasons', activeOnly],
    queryFn: async () => {
      let q = supabase
        .from('attendance_edit_reasons' as any)
        .select('*')
        .order('sort_order')
        .order('label');
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceEditReason[];
    },
  });
}

export function useQuickAddReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; description?: string | null }) => {
      const label = input.label.trim();
      if (!label) throw new Error('Label required');
      const code = label
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 40);
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('attendance_edit_reasons' as any)
        .insert({
          code,
          label,
          description: input.description?.trim() || null,
          is_active: true,
          is_system: false,
          sort_order: 500,
          created_by: userRes?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AttendanceEditReason;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance_edit_reasons'] });
      toast.success('Reason added');
    },
    onError: (e: any) => toast.error('Add failed: ' + e.message),
  });
}

export function useUpdateReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<AttendanceEditReason> }) => {
      const { error } = await supabase
        .from('attendance_edit_reasons' as any)
        .update(input.patch as any)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance_edit_reasons'] });
      toast.success('Reason updated');
    },
    onError: (e: any) => toast.error('Update failed: ' + e.message),
  });
}

export interface ReasonStatRow {
  person_id: string;
  person_type: string;
  edit_reason_code: string;
  reason_label: string | null;
  edit_count: number;
  first_at: string;
  last_at: string;
  distinct_editors: number;
}

export function useReasonStats(filters: { dateFrom?: string; dateTo?: string } = {}) {
  return useQuery({
    queryKey: ['attendance_reason_stats', filters],
    queryFn: async () => {
      // Build aggregation client-side from filtered edits so date-range works.
      let q = supabase
        .from('attendance_record_edits' as any)
        .select('person_id, person_type, edit_reason_code, actor_id, changed_at')
        .not('edit_reason_code', 'is', null)
        .order('changed_at', { ascending: false })
        .limit(5000);
      if (filters.dateFrom) q = q.gte('changed_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('changed_at', filters.dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        person_id: string;
        person_type: string;
        edit_reason_code: string;
        actor_id: string | null;
        changed_at: string;
      }>;
    },
  });
}
