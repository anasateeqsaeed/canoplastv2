import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AttendanceEditRow {
  id: string;
  attendance_record_id: string | null;
  person_id: string;
  person_type: string;
  attendance_date: string;
  actor_id: string | null;
  actor_email: string | null;
  action: 'insert' | 'update';
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  edit_reason: string | null;
  edit_reason_code: string | null;
  changed_at: string;
}

export interface AttendanceEditFilters {
  /** attendance_date >= */
  dateFrom?: string;
  /** attendance_date <= */
  dateTo?: string;
  /** changed_at >= (ISO) */
  editedFrom?: string;
  /** changed_at <= (ISO) */
  editedTo?: string;
  personId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  action?: 'insert' | 'update' | 'all';
  reasonCode?: string | null;
  limit?: number;
}

export function useAttendanceEdits(filters: AttendanceEditFilters = {}) {
  return useQuery({
    queryKey: ['attendance_edits_report', filters],
    queryFn: async () => {
      let q = supabase
        .from('attendance_record_edits' as any)
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(filters.limit ?? 500);

      if (filters.dateFrom) q = q.gte('attendance_date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('attendance_date', filters.dateTo);
      if (filters.editedFrom) q = q.gte('changed_at', filters.editedFrom);
      if (filters.editedTo) q = q.lte('changed_at', filters.editedTo);
      if (filters.personId) q = q.eq('person_id', filters.personId);
      if (filters.actorId) q = q.eq('actor_id', filters.actorId);
      if (filters.actorEmail) q = q.ilike('actor_email', `%${filters.actorEmail}%`);
      if (filters.action && filters.action !== 'all') q = q.eq('action', filters.action);
      if (filters.reasonCode) q = q.eq('edit_reason_code', filters.reasonCode);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceEditRow[];
    },
  });
}

const TRACKED = ['status', 'check_in', 'check_out', 'hours_worked', 'remarks'] as const;

export function summarizeChanges(row: AttendanceEditRow): string {
  if (row.action === 'insert') {
    const a = row.after_data ?? {};
    return `Created: status=${a.status ?? '—'}`;
  }
  const before = row.before_data ?? {};
  const after = row.after_data ?? {};
  const parts: string[] = [];
  TRACKED.forEach((f) => {
    const b = (before as any)[f];
    const a = (after as any)[f];
    if ((b ?? null) !== (a ?? null)) {
      parts.push(`${f}: ${b ?? '—'} → ${a ?? '—'}`);
    }
  });
  return parts.length ? parts.join(', ') : 'No tracked field changed';
}
