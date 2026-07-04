import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarIcon, ArrowLeft, Download, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useAttendanceForDate, AttendancePerson } from '@/hooks/useAttendanceForDate';
import { useBusinessToday } from '@/hooks/useBusinessToday';
import { STATUS_COLORS, STATUS_LABELS, AttendanceStatus } from '@/hooks/useAttendance';

type FilterKey = 'ALL' | 'P' | 'LATE' | 'L' | 'A' | 'MISSING_PUNCH' | 'HOL';

const FILTER_TILES: { key: FilterKey; label: string; color: string }[] = [
  { key: 'ALL', label: 'All', color: 'bg-slate-500 text-white' },
  { key: 'P', label: 'Present', color: 'bg-green-500 text-white' },
  { key: 'LATE', label: 'Late', color: 'bg-orange-500 text-white' },
  { key: 'L', label: 'Leave', color: 'bg-blue-500 text-white' },
  { key: 'A', label: 'Absent', color: 'bg-red-500 text-white' },
  { key: 'MISSING_PUNCH', label: 'Missing Punch', color: 'bg-amber-500 text-white' },
  { key: 'HOL', label: 'Holiday', color: 'bg-purple-500 text-white' },
];

const fmtTime = (t: string | null) => {
  if (!t) return '';
  // t is HH:mm[:ss]
  const [h, m] = t.split(':');
  return `${h}:${m}`;
};

export function AttendanceVerifyView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { today: todayStr, todayDate } = useBusinessToday();
  const dateStr = params.get('date') || todayStr;
  const filter = (params.get('filter') as FilterKey) || 'ALL';
  const [search, setSearch] = useState('');

  const date = useMemo(() => parseISO(dateStr), [dateStr]);
  const data = useAttendanceForDate(dateStr);

  const setDate = (d: Date) => {
    const next = new URLSearchParams(params);
    next.set('date', format(d, 'yyyy-MM-dd'));
    setParams(next, { replace: true });
  };
  const setFilter = (f: FilterKey) => {
    const next = new URLSearchParams(params);
    if (f === 'ALL') next.delete('filter');
    else next.set('filter', f);
    setParams(next, { replace: true });
  };

  const passesFilter = (p: AttendancePerson): boolean => {
    if (filter === 'ALL') return true;
    if (filter === 'MISSING_PUNCH') return !!p.missing_punch;
    return p.status === filter;
  };

  const filteredByDept = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.byDepartment
      .map(([dept, list]) => {
        const filtered = list.filter((p) => {
          if (!passesFilter(p)) return false;
          if (term && !p.name.toLowerCase().includes(term) && !p.code.toLowerCase().includes(term)) return false;
          return true;
        });
        return [dept, filtered] as const;
      })
      .filter(([, l]) => l.length > 0);
  }, [data.byDepartment, filter, search]);

  const totalShown = filteredByDept.reduce((s, [, l]) => s + l.length, 0);

  const missingLabel = (mp: AttendancePerson['missing_punch']) =>
    mp === 'missing_in' ? 'Missing In' : mp === 'missing_out' ? 'Missing Out' : '';

  const exportCSV = () => {
    const lines = ['#,Department,Code,Name,In,Out,Missing,Status'];
    filteredByDept.forEach(([dept, list]) => {
      list.forEach((p, idx) => {
        lines.push(
          [
            idx + 1,
            `"${dept}"`,
            `"${p.code}"`,
            `"${p.name}"`,
            fmtTime(p.check_in),
            fmtTime(p.check_out),
            missingLabel(p.missing_punch),
            `"${STATUS_LABELS[p.status]}"`,
          ].join(','),
        );
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-verify-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[12rem] justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'EEE, dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {dateStr !== todayStr && (
              <Button variant="ghost" size="sm" onClick={() => setDate(todayDate)}>
                Today
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {FILTER_TILES.map((t) => {
            const count =
              t.key === 'ALL'
                ? data.counts.TOTAL
                : (data.counts[t.key as keyof typeof data.counts] as number);
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all',
                  active ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/40'
                )}
              >
                <div className={cn('inline-flex h-6 items-center rounded px-2 text-xs font-bold', t.color)}>
                  {t.label}
                </div>
                <div className="mt-1 text-2xl font-bold">{count}</div>
              </button>
            );
          })}
        </div>

        {/* Department drilldown */}
        <div className="rounded-lg border">
          {data.isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filteredByDept.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No employees match the current filter.
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={filteredByDept.map(([d]) => d)}>
              {filteredByDept.map(([dept, list]) => {
                const c = {
                  P: list.filter((p) => p.status === 'P').length,
                  LATE: list.filter((p) => p.status === 'LATE').length,
                  L: list.filter((p) => p.status === 'L').length,
                  A: list.filter((p) => p.status === 'A').length,
                  MP: list.filter((p) => p.missing_punch).length,
                };
                return (
                  <AccordionItem key={dept} value={dept}>
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex flex-1 items-center justify-between pr-3">
                        <div className="text-left">
                          <div className="font-semibold">{dept}</div>
                          <div className="text-xs text-muted-foreground">{list.length} employees</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {c.P > 0 && <Badge className="bg-green-500 hover:bg-green-600">P {c.P}</Badge>}
                          {c.LATE > 0 && (
                            <Badge className="bg-orange-500 hover:bg-orange-600">LATE {c.LATE}</Badge>
                          )}
                          {c.L > 0 && <Badge className="bg-blue-500 hover:bg-blue-600">L {c.L}</Badge>}
                          {c.A > 0 && <Badge className="bg-red-500 hover:bg-red-600">A {c.A}</Badge>}
                          {c.MP > 0 && (
                            <Badge className="bg-amber-500 hover:bg-amber-600">MP {c.MP}</Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="overflow-x-auto px-4 pb-3">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead className="text-xs text-muted-foreground">
                            <tr className="border-b">
                              <th className="w-12 py-2 text-right font-medium pr-3">#</th>
                              <th className="py-2 text-left font-medium">Code</th>
                              <th className="py-2 text-left font-medium">Name</th>
                              <th className="py-2 text-left font-medium">Times</th>
                              <th className="py-2 text-left font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((p, idx) => {
                              const showTimes = p.check_in || p.check_out;
                              const inMissing = p.missing_punch === 'missing_in';
                              const outMissing = p.missing_punch === 'missing_out';
                              return (
                                <tr key={`${p.person_type}:${p.person_id}`} className="border-b last:border-0">
                                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{idx + 1}</td>
                                  <td className="py-2 text-muted-foreground">{p.code || '—'}</td>
                                  <td className="py-2 font-medium">{p.name}</td>
                                  <td className="py-2 tabular-nums">
                                    {showTimes ? (
                                      <span className="text-xs">
                                        <span className={cn(inMissing && 'text-amber-600 font-semibold')}>
                                          {p.check_in ? fmtTime(p.check_in) : '—'}
                                        </span>
                                        <span className="text-muted-foreground"> – </span>
                                        <span className={cn(outMissing && 'text-amber-600 font-semibold')}>
                                          {p.check_out ? fmtTime(p.check_out) : '—'}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="py-2">
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span
                                        className={cn(
                                          'inline-flex h-6 items-center rounded px-2 text-xs font-bold',
                                          STATUS_COLORS[p.status]
                                        )}
                                      >
                                        {STATUS_LABELS[p.status]}
                                      </span>
                                      {p.missing_punch && (
                                        <span className="inline-flex h-6 items-center rounded bg-amber-500 px-2 text-xs font-bold text-white">
                                          {missingLabel(p.missing_punch)}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing {totalShown} of {data.counts.TOTAL} employees · {format(date, 'PPP')}
        </div>
      </CardContent>
    </Card>
  );
}
