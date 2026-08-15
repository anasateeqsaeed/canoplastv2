import { useMemo } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { useAttendancePeople, buildAttendanceStatusMap } from '@/hooks/useAttendancePeople';
import {
  AttendanceStatus,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_PAYABLE,
  useAttendanceByRange,
  useUpdateAttendance,
} from '@/hooks/useAttendance';
import { AttendanceStatusPicker, AttendanceLegend } from './AttendanceStatusPicker';
import { cn } from '@/lib/utils';

export function MonthlyAttendanceView() {
  // Persist the viewed month (as yyyy-MM) so it survives navigating away and back.
  const [monthStr, setMonthStr] = usePersistedState('attendance.monthly.month', () =>
    format(new Date(), 'yyyy-MM'),
  );
  const month = useMemo(() => new Date(monthStr + '-01'), [monthStr]);
  const setMonth = (d: Date) => setMonthStr(format(d, 'yyyy-MM'));
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const fromStr = format(start, 'yyyy-MM-dd');
  const toStr = format(end, 'yyyy-MM-dd');

  const { data: people = [] } = useAttendancePeople();
  const { data: records = [], isLoading } = useAttendanceByRange(fromStr, toStr);
  const update = useUpdateAttendance();

  const days = useMemo(() => {
    const arr: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }, [start, end]);

  // index: key=`${type}:${id}:${date}` -> status (handles legacy mapping)
  const index = useMemo(
    () => buildAttendanceStatusMap(records as any[], people),
    [records, people],
  ) as Map<string, AttendanceStatus>;

  const computeTotals = (personKey: string) => {
    let p = 0,
      a = 0,
      l = 0,
      h = 0,
      payable = 0;
    days.forEach((d) => {
      const ds = format(d, 'yyyy-MM-dd');
      const s = index.get(`${personKey}:${ds}`);
      if (!s) return;
      if (s === 'P' || s === 'LATE') p++;
      else if (s === 'A') a++;
      else if (s === 'L') l++;
      else if (s === 'H') h++;
      payable += STATUS_PAYABLE[s];
    });
    return { p, a, l, h, payable };
  };

  const exportCSV = () => {
    const header = [
      'Code',
      'Name',
      'Group',
      ...days.map((d) => format(d, 'd')),
      'P',
      'A',
      'L',
      'H',
      'Payable',
    ];
    const lines = [header.join(',')];
    people.forEach((p) => {
      const key = `${p.person_type}:${p.person_id}`;
      const row = [
        p.code,
        `"${p.name}"`,
        `"${p.group}"`,
        ...days.map((d) => index.get(`${key}:${format(d, 'yyyy-MM-dd')}`) || ''),
      ];
      const t = computeTotals(key);
      row.push(String(t.p), String(t.a), String(t.l), String(t.h), String(t.payable));
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(month, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(addMonths(month, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="min-w-[10rem] text-center text-lg">
              {format(month, 'MMMM yyyy')}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Input
              type="month"
              value={format(month, 'yyyy-MM')}
              onChange={(e) => setMonth(new Date(e.target.value + '-01'))}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <AttendanceLegend />
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted text-[10px] uppercase">
              <tr>
                <th className="sticky left-0 z-10 min-w-[12rem] bg-muted px-2 py-2 text-left">
                  Worker
                </th>
                {days.map((d) => (
                  <th
                    key={d.toISOString()}
                    className={cn(
                      'min-w-[2rem] px-1 py-2 text-center',
                      (d.getDay() === 0 || d.getDay() === 6) && 'bg-muted-foreground/10'
                    )}
                  >
                    {format(d, 'd')}
                  </th>
                ))}
                <th className="px-2 py-2 text-center">P</th>
                <th className="px-2 py-2 text-center">A</th>
                <th className="px-2 py-2 text-center">L</th>
                <th className="px-2 py-2 text-center">Pay</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const key = `${p.person_type}:${p.person_id}`;
                const t = computeTotals(key);
                return (
                  <tr key={key} className="border-t">
                    <td className="sticky left-0 z-10 bg-background px-2 py-1.5">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.code} · {p.group}
                      </div>
                    </td>
                    {days.map((d) => {
                      const ds = format(d, 'yyyy-MM-dd');
                      const s = index.get(`${key}:${ds}`);
                      return (
                        <td
                          key={ds}
                          className={cn(
                            'px-0.5 py-1 text-center',
                            (d.getDay() === 0 || d.getDay() === 6) && 'bg-muted/30'
                          )}
                        >
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                title={s ? STATUS_LABELS[s] : 'Not marked'}
                                className={cn(
                                  'inline-flex h-6 w-7 items-center justify-center rounded text-[10px] font-bold',
                                  s ? STATUS_COLORS[s] : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {s || '·'}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                              <div className="mb-2 text-xs text-muted-foreground">
                                {p.name} · {format(d, 'd MMM yyyy')}
                              </div>
                              <AttendanceStatusPicker
                                value={s || 'P'}
                                onChange={(newS) =>
                                  update.mutate({
                                    person_id: p.person_id,
                                    person_type: p.person_type,
                                    attendance_date: ds,
                                    status: newS,
                                  })
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        </td>
                      );
                    })}
                    <td className="px-2 text-center font-semibold text-green-600">{t.p}</td>
                    <td className="px-2 text-center font-semibold text-red-600">{t.a}</td>
                    <td className="px-2 text-center font-semibold text-blue-600">{t.l}</td>
                    <td className="px-2 text-center font-bold">{t.payable}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
