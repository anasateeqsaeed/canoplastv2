import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HRAuditEntityType =
  | 'employee'
  | 'attendance_record'
  | 'payroll_run'
  | 'payroll_item'
  | 'advance_recovery'
  | 'department';

export interface HRAuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  entity_type: HRAuditEntityType;
  entity_id: string | null;
  action: 'insert' | 'update';
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_at: string;
}

interface Filters {
  entity_type?: HRAuditEntityType | 'all';
  actor_id?: string | null;
  entity_id?: string | null;
  from?: string;
  to?: string;
  limit?: number;
}

export function useHRAuditLog(filters: Filters = {}) {
  return useQuery({
    queryKey: ['hr_audit_log', filters],
    queryFn: async () => {
      let query = supabase
        .from('hr_audit_log' as any)
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(filters.limit ?? 200);

      if (filters.entity_type && filters.entity_type !== 'all') {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.actor_id) query = query.eq('actor_id', filters.actor_id);
      if (filters.entity_id) query = query.eq('entity_id', filters.entity_id);
      if (filters.from) query = query.gte('changed_at', filters.from);
      if (filters.to) query = query.lte('changed_at', filters.to);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as HRAuditLogEntry[];
    },
  });
}

/**
 * Compute a list of changed fields (key -> {before, after}) between two snapshots.
 * Used by the audit log UI to render compact diffs.
 */
export function diffSnapshots(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const result: { key: string; before: unknown; after: unknown }[] = [];
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const skip = new Set(['updated_at', 'created_at', 'marked_at']);
  keys.forEach((k) => {
    if (skip.has(k)) return;
    const b = before?.[k];
    const a = after?.[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      result.push({ key: k, before: b, after: a });
    }
  });
  return result;
}
