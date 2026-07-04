import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PersonType } from './useAttendance';

export interface AttendancePerson {
  /** Canonical id used for attendance writes (= employees.id) */
  person_id: string;
  person_type: PersonType;
  code: string;
  name: string;
  group: string;            // department or "Office Staff"
  department_id: string | null;
  designation: string;
}

/**
 * Single source of truth for who appears in attendance grids.
 * v2 has a single `employees` table (no legacy operators/staff_members),
 * so everyone is person_type 'employee'.
 */
export function useAttendancePeople() {
  return useQuery({
    queryKey: ['attendance_people'],
    queryFn: async (): Promise<AttendancePerson[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, full_name, employee_type, designation, department_id, departments(name), is_active')
        .eq('is_active', true)
        .order('employee_code');
      if (error) throw error;

      return (data || []).map((e: any) => ({
        person_id: e.id,
        person_type: 'employee' as PersonType,
        code: e.employee_code || '',
        name: e.full_name || '—',
        group: e.departments?.name || (e.employee_type === 'operator' ? 'No Department' : 'Office Staff'),
        department_id: e.department_id || null,
        designation: e.designation || '',
      }));
    },
  });
}

/**
 * Build a status lookup keyed by `${person_type}:${person_id}:${date}`.
 */
export function buildAttendanceStatusMap<T extends { person_id: string; person_type: string; attendance_date: string; status: string }>(
  records: T[],
  _people: AttendancePerson[],
): Map<string, string> {
  const map = new Map<string, string>();
  records.forEach((r) => {
    map.set(`${r.person_type}:${r.person_id}:${r.attendance_date}`, r.status);
  });
  return map;
}
