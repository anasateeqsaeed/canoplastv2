import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AttendanceStatus = 'P' | 'A' | 'L' | 'H' | 'O' | 'HOL' | 'LATE';
// v2 has a single employees table; 'operator'/'staff' kept for legacy rows.
export type PersonType = 'employee' | 'operator' | 'staff';

export interface AttendanceRecord {
  id: string;
  person_id: string;
  person_type: PersonType;
  attendance_date: string;
  status: AttendanceStatus;
  shift: string | null;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number | null;
  remarks: string | null;
  marked_by: string | null;
  marked_at: string;
  updated_by: string | null;
  updated_at: string;
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: 'Present',
  A: 'Absent',
  L: 'Leave',
  H: 'Half-day',
  O: 'Off',
  HOL: 'Holiday',
  LATE: 'Late',
};

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  P: 'bg-green-500 text-white hover:bg-green-600',
  A: 'bg-red-500 text-white hover:bg-red-600',
  L: 'bg-blue-500 text-white hover:bg-blue-600',
  H: 'bg-amber-500 text-white hover:bg-amber-600',
  O: 'bg-slate-400 text-white hover:bg-slate-500',
  HOL: 'bg-purple-500 text-white hover:bg-purple-600',
  LATE: 'bg-orange-500 text-white hover:bg-orange-600',
};

export const STATUS_PAYABLE: Record<AttendanceStatus, number> = {
  P: 1,
  A: 0,
  L: 1,
  H: 0.5,
  O: 0,
  HOL: 1,
  LATE: 1,
};

// Fetch all attendance for a single date
export function useAttendanceByDate(date: string) {
  return useQuery({
    queryKey: ['attendance', 'date', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', date);
      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!date,
    // Always refetch on mount so a tab switch back from Daily Mark
    // picks up newly-saved rows (global default is refetchOnMount: false).
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

// Fetch attendance for a month range (for monthly grid)
export function useAttendanceByRange(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['attendance', 'range', fromDate, toDate],
    queryFn: async () => {
      // Paginate to avoid the default 1000-row PostgREST cap — a full month
      // for ~60 workers exceeds 1000 rows and would silently drop later dates.
      const pageSize = 1000;
      let from = 0;
      const all: AttendanceRecord[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .gte('attendance_date', fromDate)
          .lte('attendance_date', toDate)
          .order('attendance_date')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = (data || []) as AttendanceRecord[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
    enabled: !!fromDate && !!toDate,
    // Always refetch on mount so the Monthly View reflects rows saved
    // while the user was on the Daily Mark tab (global default is false).
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

export interface BulkAttendancePayload {
  attendance_date: string;
  edit_reason?: string | null;
  edit_reason_code?: string | null;
  records: Array<{
    person_id: string;
    person_type: PersonType;
    status: AttendanceStatus;
    shift?: string | null;
    remarks?: string | null;
    check_in?: string | null;   // HH:mm[:ss]
    check_out?: string | null;  // HH:mm[:ss]
    hours_worked?: number | null;
  }>;
}

function computeHours(checkIn?: string | null, checkOut?: string | null, lunchMins = 60): number | null {
  if (!checkIn || !checkOut) return null;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const span = toMin(checkOut) - toMin(checkIn);
  if (span <= 0) return null;
  return Math.max(0, Math.round(((span - lunchMins) / 60) * 100) / 100);
}

// Bulk upsert (used by Daily Mark grid Save button)
export function useBulkUpsertAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkAttendancePayload) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id ?? null;

      const rows = payload.records.map((r) => {
        const ci = r.check_in || null;
        const co = r.check_out || null;
        return {
          person_id: r.person_id,
          person_type: r.person_type,
          attendance_date: payload.attendance_date,
          status: r.status,
          shift: r.shift ?? null,
          remarks: r.remarks ?? null,
          check_in: ci,
          check_out: co,
          hours_worked: r.hours_worked ?? computeHours(ci, co),
          marked_by: uid,
          updated_by: uid,
          edit_reason: payload.edit_reason ?? null,
          edit_reason_code: payload.edit_reason_code ?? null,
        } as any;
      });

      const { error } = await supabase
        .from('attendance_records')
        .upsert(rows, { onConflict: 'person_id,person_type,attendance_date' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`Attendance saved for ${vars.attendance_date}`);
    },
    onError: (e: any) => toast.error('Save failed: ' + e.message),
  });
}

// Single update (used by monthly cell editor)
export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: {
        person_id: string;
        person_type: PersonType;
        attendance_date: string;
        status: AttendanceStatus;
        remarks?: string | null;
      }
    ) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id ?? null;
      const { error } = await supabase
        .from('attendance_records')
        .upsert(
          {
            person_id: input.person_id,
            person_type: input.person_type,
            attendance_date: input.attendance_date,
            status: input.status,
            remarks: input.remarks ?? null,
            marked_by: uid,
            updated_by: uid,
          },
          { onConflict: 'person_id,person_type,attendance_date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Updated');
    },
    onError: (e: any) => toast.error('Update failed: ' + e.message),
  });
}
