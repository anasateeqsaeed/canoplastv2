import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PersonType } from './useAttendance';

export interface ShiftRoster {
  id: string;
  person_id: string;
  person_type: PersonType;
  roster_date: string;
  shift: string;
  notes: string | null;
}

export function useShiftRosterRange(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['shift_rosters', fromDate, toDate],
    queryFn: async (): Promise<ShiftRoster[]> => {
      const { data, error } = await supabase
        .from('shift_rosters')
        .select('id, person_id, person_type, roster_date, shift, notes')
        .gte('roster_date', fromDate)
        .lte('roster_date', toDate);
      if (error) throw error;
      return (data as any[]) as ShiftRoster[];
    },
    enabled: !!fromDate && !!toDate,
  });
}

export interface UpsertRosterInput {
  person_id: string;
  person_type: PersonType;
  roster_date: string;
  shift: string; // 'day' | 'night' | 'afternoon' | 'off'
  notes?: string | null;
}

export function useUpsertShiftRoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: UpsertRosterInput[]) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id ?? null;
      const payload = rows.map((r) => ({ ...r, created_by: uid }));
      const { error } = await supabase
        .from('shift_rosters')
        .upsert(payload, { onConflict: 'person_id,person_type,roster_date' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift_rosters'] });
      toast.success('Roster saved');
    },
    onError: (e: any) => toast.error('Roster save failed: ' + e.message),
  });
}

export function useDeleteRosterCells() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase.from('shift_rosters').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift_rosters'] }),
  });
}

/** Resolve effective shift for a single person/date via the SQL function. */
export async function resolveShiftRPC(personId: string, personType: PersonType, date: string): Promise<string> {
  const { data, error } = await supabase.rpc('resolve_shift', {
    _person_id: personId,
    _person_type: personType,
    _date: date,
  });
  if (error) throw error;
  return (data as string) || 'day';
}
