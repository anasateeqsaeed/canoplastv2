import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AttendanceStatus, PersonType } from './useAttendance';

export interface ImportRecordInput {
  person_id: string;
  person_type: PersonType;
  attendance_date: string;
  status: AttendanceStatus;
  shift?: string | null;
  check_in: string | null;   // HH:mm:ss
  check_out: string | null;  // HH:mm:ss
  hours_worked: number | null;
  remarks: string | null;
}

export function useImportPunchAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: ImportRecordInput[]) => {
      if (records.length === 0) return { saved: 0 };
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id ?? null;

      const rows = records.map((r) => ({
        person_id: r.person_id,
        person_type: r.person_type,
        attendance_date: r.attendance_date,
        status: r.status,
        shift: r.shift ?? null,
        check_in: r.check_in,
        check_out: r.check_out,
        hours_worked: r.hours_worked,
        remarks: r.remarks,
        marked_by: uid,
        updated_by: uid,
      }));

      // Chunk to keep payload sensible
      const CHUNK = 500;
      let saved = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const { error } = await supabase
          .from('attendance_records')
          .upsert(slice, { onConflict: 'person_id,person_type,attendance_date' });
        if (error) throw error;
        saved += slice.length;
      }
      return { saved };
    },
    onSuccess: ({ saved }) => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`Imported ${saved} attendance record${saved === 1 ? '' : 's'}`);
    },
    onError: (e: any) => toast.error('Import failed: ' + e.message),
  });
}
