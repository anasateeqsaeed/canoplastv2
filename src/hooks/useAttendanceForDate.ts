import { useMemo } from 'react';
import { useAttendanceByDate, AttendanceStatus } from './useAttendance';
import { useAttendancePeople, buildAttendanceStatusMap } from './useAttendancePeople';

export type MissingPunch = 'missing_in' | 'missing_out' | null;

export interface AttendancePerson {
  person_id: string;
  person_type: 'employee' | 'operator' | 'staff';
  name: string;
  code: string;
  department: string;
  /** Raw status including NOT_MARKED (kept for tracing). */
  raw_status: AttendanceStatus | 'NOT_MARKED';
  /** Display status: NOT_MARKED is folded into 'A' (Absent) for the Verify view. */
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  missing_punch: MissingPunch;
}

export function useAttendanceForDate(date: string) {
  const { data: records = [], isLoading: lr } = useAttendanceByDate(date);
  const { data: roster = [], isLoading: lp } = useAttendancePeople();

  const result = useMemo(() => {
    const statusMap = buildAttendanceStatusMap(records as any[], roster);

    // Build a lookup of raw record (for check_in / check_out) by person key
    const recIndex = new Map<string, any>();
    (records as any[]).forEach((r) => {
      recIndex.set(`${r.person_type}:${r.person_id}`, r);
    });

    const people: AttendancePerson[] = roster.map((p) => {
      const raw = statusMap.get(`${p.person_type}:${p.person_id}:${date}`) as
        | AttendanceStatus
        | undefined;
      const rawStatus: AttendanceStatus | 'NOT_MARKED' = raw || 'NOT_MARKED';
      const display: AttendanceStatus = rawStatus === 'NOT_MARKED' ? 'A' : rawStatus;

      const rec = recIndex.get(`${p.person_type}:${p.person_id}`);
      const check_in = rec?.check_in ?? null;
      const check_out = rec?.check_out ?? null;

      let missing_punch: MissingPunch = null;
      if (display === 'P' || display === 'LATE') {
        if (check_in && !check_out) missing_punch = 'missing_out';
        else if (!check_in && check_out) missing_punch = 'missing_in';
      }

      return {
        person_id: p.person_id,
        person_type: p.person_type,
        name: p.name,
        code: p.code,
        department: p.group,
        raw_status: rawStatus,
        status: display,
        check_in,
        check_out,
        missing_punch,
      };
    });

    const byDepartment = new Map<string, AttendancePerson[]>();
    people.forEach((p) => {
      const arr = byDepartment.get(p.department) || [];
      arr.push(p);
      byDepartment.set(p.department, arr);
    });

    const filterBy = (s: AttendanceStatus) => people.filter((p) => p.status === s);
    const missingPunchList = people.filter((p) => p.missing_punch);

    return {
      people,
      byDepartment: Array.from(byDepartment.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      lateList: filterBy('LATE'),
      leaveList: filterBy('L'),
      absentList: filterBy('A'),
      presentList: people.filter((p) => p.status === 'P' || p.status === 'LATE'),
      holidayList: filterBy('HOL'),
      missingPunchList,
      counts: {
        P: filterBy('P').length,
        LATE: filterBy('LATE').length,
        L: filterBy('L').length,
        A: filterBy('A').length,
        H: filterBy('H').length,
        HOL: filterBy('HOL').length,
        O: filterBy('O').length,
        MISSING_PUNCH: missingPunchList.length,
        NOT_MARKED: people.filter((p) => p.raw_status === 'NOT_MARKED').length,
        TOTAL: people.length,
      },
    };
  }, [records, roster, date]);

  return { ...result, isLoading: lr || lp };
}
