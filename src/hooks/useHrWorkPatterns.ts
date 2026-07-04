import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HrWorkPattern {
  id: string;
  code: string;
  name: string;
  color: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  grace_minutes: number;
  lunch_minutes: number;
  standard_hours: number;
  ot_threshold_hours: number;
  standard_days_per_month: number;
  weekly_off_days: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type HrWorkPatternInput = Partial<Omit<HrWorkPattern, 'id' | 'created_at' | 'updated_at'>>;

const TABLE = 'hr_work_patterns' as any;

export function useHrWorkPatterns(opts?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['hr_work_patterns', opts?.includeInactive ?? false],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('name');
      if (!opts?.includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as HrWorkPattern[];
    },
  });
}

export function useCreateHrWorkPattern() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: HrWorkPatternInput) => {
      const code = (input.code || input.name || '').trim().toLowerCase().replace(/\s+/g, '_');
      if (!code) throw new Error('Code or name is required');
      const payload: any = {
        code,
        name: (input.name || '').trim() || code,
        color: input.color || 'slate',
        start_hour: input.start_hour ?? 9,
        start_minute: input.start_minute ?? 0,
        end_hour: input.end_hour ?? 17,
        end_minute: input.end_minute ?? 0,
        grace_minutes: input.grace_minutes ?? 15,
        lunch_minutes: input.lunch_minutes ?? 60,
        standard_hours: input.standard_hours ?? 8,
        ot_threshold_hours: input.ot_threshold_hours ?? 8,
        standard_days_per_month: input.standard_days_per_month ?? 26,
        weekly_off_days: input.weekly_off_days ?? [5],
        is_active: input.is_active ?? true,
      };
      const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
      if (error) throw error;
      return data as unknown as HrWorkPattern;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr_work_patterns'] });
      toast.success('Work pattern added');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add work pattern'),
  });
}

export function useUpdateHrWorkPattern() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: HrWorkPatternInput & { id: string }) => {
      const payload: any = { ...input };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('No rows updated — check permissions');
      return data as unknown as HrWorkPattern;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr_work_patterns'] });
      toast.success('Work pattern updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });
}

export function useDeleteHrWorkPattern() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr_work_patterns'] });
      toast.success('Work pattern deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete (may be in use)'),
  });
}

export function formatPatternTime(p: Pick<HrWorkPattern, 'start_hour' | 'start_minute' | 'end_hour' | 'end_minute'>) {
  const fmt = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  return `${fmt(p.start_hour, p.start_minute)} – ${fmt(p.end_hour, p.end_minute)}`;
}

export function patternDurationHours(p: Pick<HrWorkPattern, 'start_hour' | 'start_minute' | 'end_hour' | 'end_minute'>) {
  const start = p.start_hour * 60 + p.start_minute;
  let end = p.end_hour * 60 + p.end_minute;
  if (end <= start) end += 24 * 60;
  return ((end - start) / 60).toFixed(1);
}
