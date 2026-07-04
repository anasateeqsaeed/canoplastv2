import { useMemo } from 'react';
import { useAttendancePeople } from './useAttendancePeople';
import { useAttendanceByRange } from './useAttendance';
import { isWorkingDay } from '@/lib/workingDays';

export interface MissingEntry {
  person_id: string;
  person_type: string;
  code: string;
  name: string;
  group: string;
  department_id: string | null;
  date: string;
  weekday: string;
}

function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useMissingAttendance(opts: {
  from: string;
  to: string;
  departmentId?: string | 'all';
}) {
  const { from, to, departmentId = 'all' } = opts;
  const { data: people = [], isLoading: peopleLoading } = useAttendancePeople();
  const { data: records = [], isLoading: recLoading } = useAttendanceByRange(from, to);

  const rows = useMemo<MissingEntry[]>(() => {
    if (!from || !to) return [];
    const dates = eachDate(from, to).filter((d) => isWorkingDay(new Date(d + 'T00:00:00')));
    const marked = new Set<string>();
    records.forEach((r) => {
      marked.add(`${r.person_type}:${r.person_id}:${r.attendance_date}`);
    });
    const filteredPeople =
      departmentId === 'all'
        ? people
        : departmentId === '__none__'
        ? people.filter((p) => !p.department_id)
        : people.filter((p) => p.department_id === departmentId);

    const out: MissingEntry[] = [];
    filteredPeople.forEach((p) => {
      dates.forEach((d) => {
        const k = `${p.person_type}:${p.person_id}:${d}`;
        if (!marked.has(k)) {
          out.push({
            person_id: p.person_id,
            person_type: p.person_type,
            code: p.code,
            name: p.name,
            group: p.group,
            department_id: p.department_id,
            date: d,
            weekday: WEEKDAY[new Date(d + 'T00:00:00').getDay()],
          });
        }
      });
    });
    out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.name.localeCompare(b.name)));
    return out;
  }, [people, records, from, to, departmentId]);

  return { rows, isLoading: peopleLoading || recLoading };
}
