import { useEffect, useMemo, useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { Save, ChevronLeft, ChevronRight, Copy, ArrowLeftRight } from 'lucide-react';
import { useAttendancePeople } from '@/hooks/useAttendancePeople';
import { useShiftRosterRange, useUpsertShiftRoster } from '@/hooks/useShiftRoster';
import { useHrWorkPatterns, formatPatternTime } from '@/hooks/useHrWorkPatterns';
import type { PersonType } from '@/hooks/useAttendance';
import { toast } from 'sonner';

const COLOR_TEXT_MAP: Record<string, string> = {
  slate: 'text-slate-600',
  gray: 'text-gray-600',
  zinc: 'text-zinc-600',
  red: 'text-red-600',
  orange: 'text-orange-600',
  amber: 'text-amber-600',
  yellow: 'text-yellow-600',
  lime: 'text-lime-600',
  green: 'text-green-600',
  emerald: 'text-emerald-600',
  teal: 'text-teal-600',
  cyan: 'text-cyan-600',
  sky: 'text-sky-600',
  blue: 'text-blue-600',
  indigo: 'text-indigo-600',
  violet: 'text-violet-600',
  purple: 'text-purple-600',
  fuchsia: 'text-fuchsia-600',
  pink: 'text-pink-600',
  rose: 'text-rose-600',
};

type ShiftCode = string;

// Roster week starts Monday, ends Sunday (off day)
function getWeekStart(d: Date): Date {
  // date-fns weekStartsOn: 1 = Monday
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function WeeklyRosterView() {
  const [anchor, setAnchor] = usePersistedState('attendance.roster.anchor', () =>
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [deptFilter, setDeptFilter] = usePersistedState<string>('attendance.roster.dept', 'all');

  const weekStart = useMemo(() => getWeekStart(parseISO(anchor)), [anchor]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const fromDate = format(weekStart, 'yyyy-MM-dd');
  const toDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const { data: people = [] } = useAttendancePeople();
  const { data: roster = [] } = useShiftRosterRange(fromDate, toDate);
  const upsert = useUpsertShiftRoster();

  const { data: patterns = [] } = useHrWorkPatterns();
  const SHIFT_OPTIONS = useMemo(() => {
    return [
      { value: '', label: '—', cls: 'text-muted-foreground' },
      ...patterns.map((p) => ({
        value: p.code,
        label: `${p.name} (${formatPatternTime(p)})`,
        cls: COLOR_TEXT_MAP[p.color] || 'text-foreground',
      })),
      { value: 'off', label: 'Off', cls: 'text-slate-500' },
    ];
  }, [patterns]);

  const departments = useMemo(() => {
    const m = new Map<string, string>();
    people.forEach((p) => p.department_id && m.set(p.department_id, p.group));
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [people]);

  const filteredPeople = useMemo(() => {
    if (deptFilter === 'all') return people;
    if (deptFilter === '__none__') return people.filter((p) => !p.department_id);
    return people.filter((p) => p.department_id === deptFilter);
  }, [people, deptFilter]);

  // grid state: { `${ptype}:${pid}:${date}` -> shift }
  const [grid, setGrid] = useState<Record<string, ShiftCode>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next: Record<string, ShiftCode> = {};
    filteredPeople.forEach((p) => {
      days.forEach((d) => {
        const ds = format(d, 'yyyy-MM-dd');
        const key = `${p.person_type}:${p.person_id}:${ds}`;
        const r = roster.find(
          (x) => x.person_id === p.person_id && x.person_type === p.person_type && x.roster_date === ds,
        );
        next[key] = (r?.shift as ShiftCode) || '';
      });
    });
    setGrid(next);
    setDirty(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, filteredPeople.length, roster.length]);

  const setCell = (key: string, v: ShiftCode) => {
    setGrid((g) => ({ ...g, [key]: v }));
    setDirty((d) => new Set(d).add(key));
  };

  const applyRowToWeek = (p: { person_id: string; person_type: PersonType }, fromDay: Date) => {
    const fromKey = `${p.person_type}:${p.person_id}:${format(fromDay, 'yyyy-MM-dd')}`;
    const v = grid[fromKey];
    if (!v) return;
    days.forEach((d) => {
      const k = `${p.person_type}:${p.person_id}:${format(d, 'yyyy-MM-dd')}`;
      setCell(k, v);
    });
  };

  // Token-based day/night swap: works for any pattern code containing
  // a 'day' or 'night' token (e.g. Production_day <-> Production_night,
  // supervisor_day <-> supervisor_night, General-Day <-> General-Night).
  const DAY_NIGHT_RE = /(^|[^a-z])(day|night)([^a-z]|$)/i;

  const findSwapTarget = (currentCode: string): string | null => {
    const m = currentCode.match(DAY_NIGHT_RE);
    if (!m) return null;
    const token = m[2];
    const opposite = token.toLowerCase() === 'day' ? 'night' : 'day';
    // Preserve original casing pattern of the matched token
    const cased =
      token === token.toUpperCase()
        ? opposite.toUpperCase()
        : token[0] === token[0].toUpperCase()
        ? opposite[0].toUpperCase() + opposite.slice(1)
        : opposite;
    // Build candidate by replacing only the matched token occurrence
    const candidate =
      currentCode.slice(0, m.index! + m[1].length) +
      cased +
      currentCode.slice(m.index! + m[1].length + token.length);
    // Try exact match first, then case-insensitive lookup against available codes
    const exact = SHIFT_OPTIONS.find((o) => o.value === candidate);
    if (exact) return exact.value;
    const ci = SHIFT_OPTIONS.find(
      (o) => o.value && o.value.toLowerCase() === candidate.toLowerCase(),
    );
    return ci ? ci.value : null;
  };

  const swapDayNight = (p: { person_id: string; person_type: PersonType }) => {
    days.forEach((d) => {
      const k = `${p.person_type}:${p.person_id}:${format(d, 'yyyy-MM-dd')}`;
      const v = grid[k];
      if (!v) return;
      const target = findSwapTarget(v);
      if (target) setCell(k, target as ShiftCode);
    });
  };

  const copyLastWeek = async () => {
    const prevFrom = format(addDays(weekStart, -7), 'yyyy-MM-dd');
    const prevTo = format(addDays(weekStart, -1), 'yyyy-MM-dd');
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('shift_rosters')
      .select('person_id, person_type, roster_date, shift')
      .gte('roster_date', prevFrom)
      .lte('roster_date', prevTo);
    if (error) {
      toast.error('Copy failed: ' + error.message);
      return;
    }
    const visible = new Set(filteredPeople.map((p) => `${p.person_type}:${p.person_id}`));
    const updates: Record<string, ShiftCode> = {};
    (data || []).forEach((r: any) => {
      if (!r.shift) return;
      if (!visible.has(`${r.person_type}:${r.person_id}`)) return;
      const dayIndex = Math.round(
        (parseISO(r.roster_date).getTime() - parseISO(prevFrom).getTime()) / 86400000,
      );
      if (dayIndex < 0 || dayIndex > 6) return;
      const newDate = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
      updates[`${r.person_type}:${r.person_id}:${newDate}`] = r.shift as ShiftCode;
    });
    const keys = Object.keys(updates);
    if (!keys.length) {
      toast.info('No roster found for last week (for current filter).');
      return;
    }
    setGrid((g) => ({ ...g, ...updates }));
    setDirty((d) => {
      const next = new Set(d);
      keys.forEach((k) => next.add(k));
      return next;
    });
    toast.success(`Copied ${keys.length} roster cell${keys.length === 1 ? '' : 's'} from last week. Click Save to persist.`);
  };

  const handleSave = () => {
    const rows = Array.from(dirty)
      .map((k) => {
        const v = grid[k];
        if (!v) return null;
        const [pt, pid, dt] = k.split(':');
        return { person_id: pid, person_type: pt as PersonType, roster_date: dt, shift: v };
      })
      .filter(Boolean) as any[];
    if (!rows.length) return;
    upsert.mutate(rows, { onSuccess: () => setDirty(new Set()) });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Week of</label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setAnchor(format(addDays(weekStart, -7), 'yyyy-MM-dd'))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Input
                    type="date"
                    value={anchor}
                    onChange={(e) => setAnchor(e.target.value)}
                    className="w-40"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setAnchor(format(addDays(weekStart, 7), 'yyyy-MM-dd'))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Department</label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__none__">No Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLastWeek}>
                <Copy className="mr-1 h-4 w-4" />
                Copy last week
              </Button>
              <Button onClick={handleSave} disabled={upsert.isPending || dirty.size === 0}>
                <Save className="mr-1 h-4 w-4" />
                {upsert.isPending ? 'Saving…' : `Save (${dirty.size})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left">Employee</th>
                {days.map((d) => {
                  const isOff = d.getDay() === 0;
                  return (
                    <th key={d.toISOString()} className={`px-2 py-2 text-center ${isOff ? 'text-rose-600' : ''}`}>
                      {format(d, 'EEE')}
                      <div className="text-[10px] font-normal">{format(d, 'dd MMM')}</div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-right">Tools</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.map((p) => (
                <tr key={`${p.person_type}:${p.person_id}`} className="border-t">
                  <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-mono">{p.code}</span> · {p.group}
                    </div>
                  </td>
                  {days.map((d) => {
                    const ds = format(d, 'yyyy-MM-dd');
                    const k = `${p.person_type}:${p.person_id}:${ds}`;
                    const v = grid[k] || '';
                    const isOff = d.getDay() === 0;
                    const opt = SHIFT_OPTIONS.find((o) => o.value === v);
                    return (
                      <td key={ds} className={`px-1 py-1 ${isOff ? 'bg-rose-50/40' : ''}`}>
                        <Select value={v || '__none'} onValueChange={(val) => setCell(k, val === '__none' ? '' : (val as ShiftCode))}>
                          <SelectTrigger className={`h-7 px-2 text-xs ${opt?.cls || ''}`}>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIFT_OPTIONS.map((o) => (
                              <SelectItem key={o.value || '__none'} value={o.value || '__none'}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    );
                  })}
                  <td className="px-1 py-1 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Apply Monday's shift to whole week"
                        onClick={() => applyRowToWeek(p, days[0])}
                      >
                        Apply&nbsp;wk
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Swap shift pairs (Day↔Night, Production, Supervisor, General↔Night Packing)"
                        onClick={() => swapDayNight(p)}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredPeople.length && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    No employees in selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
