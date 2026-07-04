import { useMemo } from 'react';
import { useAttendanceByDate } from './useAttendance';
import { useAttendancePeople } from './useAttendancePeople';
import { useShiftRules } from './useShiftRules';

export interface OvertimePerson {
  person_id: string;
  person_type: 'operator' | 'staff';
  name: string;
  code: string;
  department: string;
  shift: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workedHours: number | null;
  otHours: number;
}

/**
 * Returns the list of people who worked overtime on the given date,
 * computed via HR work patterns (same rules as the Shift & OT report).
 */
export function useAttendanceOvertimeForDate(date: string) {
  const { data: records = [], isLoading: lr } = useAttendanceByDate(date);
  const { data: roster = [], isLoading: lp } = useAttendancePeople();
  const { evaluate } = useShiftRules();

  const overtimeList = useMemo<OvertimePerson[]>(() => {
    // Build legacy id → employee map (mirrors buildAttendanceStatusMap logic)
    const legacyToEmp = new Map<string, { person_id: string; person_type: 'operator' | 'staff' }>();
    roster.forEach((p) => {
      if (p.legacy_operator_id) {
        legacyToEmp.set(`operator:${p.legacy_operator_id}`, { person_id: p.person_id, person_type: p.person_type });
      }
      if (p.legacy_staff_id) {
        legacyToEmp.set(`staff:${p.legacy_staff_id}`, { person_id: p.person_id, person_type: p.person_type });
      }
    });
    const byId = new Map(roster.map((p) => [`${p.person_type}:${p.person_id}`, p]));

    const out: OvertimePerson[] = [];
    for (const r of records) {
      let person = byId.get(`${r.person_type}:${r.person_id}`);
      if (!person) {
        const remap = legacyToEmp.get(`${r.person_type}:${r.person_id}`);
        if (remap) person = byId.get(`${remap.person_type}:${remap.person_id}`);
      }
      if (!person) continue;

      const evalRes = evaluate(r.shift, r.check_in, r.check_out, r.hours_worked);
      if (evalRes.otHours > 0) {
        out.push({
          person_id: person.person_id,
          person_type: person.person_type,
          name: person.name,
          code: person.code,
          department: person.group,
          shift: r.shift,
          checkIn: r.check_in,
          checkOut: r.check_out,
          workedHours: evalRes.workedHours,
          otHours: evalRes.otHours,
        });
      }
    }
    return out.sort((a, b) => b.otHours - a.otHours);
  }, [records, roster, evaluate]);

  return { overtimeList, isLoading: lr || lp };
}
