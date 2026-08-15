import { useMemo } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { useAttendancePeople } from '@/hooks/useAttendancePeople';
import { useAttendanceByRange } from '@/hooks/useAttendance';
import { useShiftRosterRange } from '@/hooks/useShiftRoster';
import { useShiftRules } from '@/hooks/useShiftRules';
import { useHrWorkPatterns } from '@/hooks/useHrWorkPatterns';

interface Row {
  key: string;
  code: string;
  name: string;
  department: string;
  daysWorked: number;
  standardHours: number;
  workedHours: number;
  otHours: number;
  lateCount: number;
  lateMinutes: number;
  absent: number;
  leave: number;
  byShift: Record<string, number>;
}

export function ShiftOTReport() {
  const today = new Date();
  const [from, setFrom] = usePersistedState('attendance.shiftOt.from', () =>
    format(startOfMonth(today), 'yyyy-MM-dd'),
  );
  const [to, setTo] = usePersistedState('attendance.shiftOt.to', () =>
    format(endOfMonth(today), 'yyyy-MM-dd'),
  );
  const [deptFilter, setDeptFilter] = usePersistedState<string>('attendance.shiftOt.dept', 'all');
  const [shiftFilter, setShiftFilter] = usePersistedState<string>('attendance.shiftOt.shift', 'all');

  const { data: people = [] } = useAttendancePeople();
  const { data: records = [] } = useAttendanceByRange(from, to);
  const { data: roster = [] } = useShiftRosterRange(from, to);
  const { evaluate } = useShiftRules();
  const { data: patterns = [] } = useHrWorkPatterns({ includeInactive: true });
  const activeShifts = useMemo(
    () =>
      patterns
        .filter((p) => p.is_active)
        .map((p) => ({
          id: p.id,
          shift_name: p.code,
          display_name: p.name,
          key: p.code.trim().toLowerCase(),
        })),
    [patterns],
  );

  const departments = useMemo(() => {
    const m = new Map<string, string>();
    people.forEach((p) => p.department_id && m.set(p.department_id, p.group));
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [people]);

  const rows: Row[] = useMemo(() => {
    const dateList = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map((d) =>
      format(d, 'yyyy-MM-dd'),
    );

    return people
      .filter((p) => deptFilter === 'all' || (deptFilter === '__none__' ? !p.department_id : p.department_id === deptFilter))
      .map((p) => {
        const row: Row = {
          key: `${p.person_type}:${p.person_id}`,
          code: p.code,
          name: p.name,
          department: p.group,
          daysWorked: 0,
          standardHours: 0,
          workedHours: 0,
          otHours: 0,
          lateCount: 0,
          lateMinutes: 0,
          absent: 0,
          leave: 0,
          byShift: {},
        };

        for (const ds of dateList) {
          const rec = records.find(
            (r: any) => r.person_id === p.person_id && r.person_type === p.person_type && r.attendance_date === ds,
          );
          const ros = roster.find(
            (x) => x.person_id === p.person_id && x.person_type === p.person_type && x.roster_date === ds,
          );
          const shift = ros?.shift || rec?.shift || null;
          const shiftKey = (shift || '').trim().toLowerCase();

          if (shiftFilter !== 'all' && shiftKey !== shiftFilter) continue;

          if (rec) {
            if (rec.status === 'A') row.absent++;
            if (rec.status === 'L') row.leave++;
            if (rec.status === 'P' || rec.status === 'LATE' || rec.status === 'H') {
              const evalRes = evaluate(shift, rec.check_in, rec.check_out, rec.hours_worked);
              row.daysWorked++;
              row.standardHours += evalRes.standardHours * (rec.status === 'H' ? 0.5 : 1);
              if (evalRes.workedHours != null) row.workedHours += evalRes.workedHours;
              row.otHours += evalRes.otHours;
              if (evalRes.isLate) {
                row.lateCount++;
                row.lateMinutes += evalRes.lateMinutes;
              }
              if (shiftKey) row.byShift[shiftKey] = (row.byShift[shiftKey] || 0) + 1;
            }
          }
        }

        row.workedHours = Math.round(row.workedHours * 100) / 100;
        row.otHours = Math.round(row.otHours * 100) / 100;
        row.standardHours = Math.round(row.standardHours * 100) / 100;
        return row;
      });
  }, [people, records, roster, from, to, deptFilter, shiftFilter, evaluate]);

  const exportCsv = () => {
    const shiftCols = activeShifts.map((s) => `${s.display_name || s.shift_name} shifts`);
    const header = ['Code', 'Name', 'Department', 'Days', ...shiftCols, 'Std hours', 'Worked hours', 'OT hours', 'Late', 'Late mins', 'Absent', 'Leave'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        r.code, JSON.stringify(r.name), JSON.stringify(r.department),
        r.daysWorked,
        ...activeShifts.map((s) => r.byShift[s.key] || 0),
        r.standardHours, r.workedHours, r.otHours, r.lateCount, r.lateMinutes, r.absent, r.leave,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-ot-report_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Department</label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                    <SelectItem value="__none__">No Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Shift</label>
                <Select value={shiftFilter} onValueChange={setShiftFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {activeShifts.map((s) => (
                      <SelectItem key={s.id} value={s.key}>
                        {s.display_name || s.shift_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1 h-4 w-4" />Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Department</th>
                <th className="px-2 py-2 text-right">Days</th>
                {activeShifts.map((s) => (
                  <th key={s.id} className="px-2 py-2 text-right">
                    {(s.display_name || s.shift_name).slice(0, 6)}
                  </th>
                ))}
                <th className="px-2 py-2 text-right">Std h</th>
                <th className="px-2 py-2 text-right">Worked h</th>
                <th className="px-2 py-2 text-right">OT h</th>
                <th className="px-2 py-2 text-right">Late</th>
                <th className="px-2 py-2 text-right">Late min</th>
                <th className="px-2 py-2 text-right">A</th>
                <th className="px-2 py-2 text-right">L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="px-3 py-1.5 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-1.5 font-medium">{r.name}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.department}</td>
                  <td className="px-2 py-1.5 text-right">{r.daysWorked}</td>
                  {activeShifts.map((s) => (
                    <td key={s.id} className="px-2 py-1.5 text-right">{r.byShift[s.key] || 0}</td>
                  ))}
                  <td className="px-2 py-1.5 text-right">{r.standardHours}</td>
                  <td className="px-2 py-1.5 text-right">{r.workedHours}</td>
                  <td className="px-2 py-1.5 text-right font-medium text-emerald-700">{r.otHours || ''}</td>
                  <td className="px-2 py-1.5 text-right text-orange-700">{r.lateCount || ''}</td>
                  <td className="px-2 py-1.5 text-right text-orange-700">{r.lateMinutes || ''}</td>
                  <td className="px-2 py-1.5 text-right text-rose-600">{r.absent || ''}</td>
                  <td className="px-2 py-1.5 text-right text-blue-600">{r.leave || ''}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={11 + activeShifts.length} className="py-8 text-center text-sm text-muted-foreground">No data.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
