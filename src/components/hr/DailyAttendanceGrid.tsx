import { useEffect, useMemo, useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Users, CheckCheck, FileSpreadsheet, History } from 'lucide-react';
import { format } from 'date-fns';
import { useAttendancePeople, buildAttendanceStatusMap } from '@/hooks/useAttendancePeople';
import {
  AttendanceStatus,
  PersonType,
  useAttendanceByDate,
  useBulkUpsertAttendance,
} from '@/hooks/useAttendance';
import { AttendanceStatusPicker, AttendanceLegend } from './AttendanceStatusPicker';
import { ImportPunchReportDialog } from './ImportPunchReportDialog';
import { AttendanceEditHistoryDialog } from './AttendanceEditHistoryDialog';
import { EditReasonDialog } from './EditReasonDialog';
import { useAuth } from '@/hooks/useAuth';
import { useShiftRosterRange } from '@/hooks/useShiftRoster';
import { useShiftRules } from '@/hooks/useShiftRules';
import { Badge } from '@/components/ui/badge';

import { useBusinessToday } from '@/hooks/useBusinessToday';

interface RowState {
  person_id: string;
  person_type: PersonType;
  status: AttendanceStatus;
  remarks: string;
  check_in: string;   // HH:mm
  check_out: string;  // HH:mm
  shift: string;      // 'day' | 'night' | 'afternoon' | ''
}

export function DailyAttendanceGrid() {
  const { today: businessToday } = useBusinessToday();
  const [date, setDate] = usePersistedState('attendance.daily.date', businessToday);
  const [deptFilter, setDeptFilter] = usePersistedState<string>('attendance.daily.dept', 'all');
  const [importOpen, setImportOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<{ person_id: string; person_type: PersonType; name: string } | null>(null);
  const { isAdmin } = useAuth();
  const admin = isAdmin();

  const { data: people = [] } = useAttendancePeople();
  const { data: existing = [], isLoading } = useAttendanceByDate(date);
  const { data: roster = [] } = useShiftRosterRange(date, date);
  const { evaluate, settings: shiftSettings } = useShiftRules();
  const bulkSave = useBulkUpsertAttendance();

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((p) => {
      if (p.department_id && p.group) map.set(p.department_id, p.group);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [people]);

  const allPeople = useMemo(() => {
    let list = people;
    if (deptFilter === '__none__') list = people.filter((p) => !p.department_id);
    else if (deptFilter !== 'all') list = people.filter((p) => p.department_id === deptFilter);
    return list.map((p) => ({
      person_id: p.person_id,
      person_type: p.person_type,
      code: p.code,
      name: p.name,
      group: p.group,
      sub: p.designation || (p.person_type === 'operator' ? 'Operator' : 'Staff'),
    }));
  }, [people, deptFilter]);

  // Status lookup tolerant of legacy operator/staff_member ids
  const statusIndex = useMemo(
    () => buildAttendanceStatusMap(existing as any[], people),
    [existing, people],
  );

  // Default active shift name (first active in settings, fallback 'day')
  const defaultActiveShift = useMemo(() => {
    return shiftSettings.find((s) => s.is_active)?.shift_name || 'day';
  }, [shiftSettings]);

  // Build state map
  const [rows, setRows] = useState<Record<string, RowState>>({});

  useEffect(() => {
    const next: Record<string, RowState> = {};
    allPeople.forEach((p) => {
      const key = `${p.person_type}:${p.person_id}`;
      const status = statusIndex.get(`${p.person_type}:${p.person_id}:${date}`) as AttendanceStatus | undefined;
      const found = existing.find(
        (e) => e.person_id === p.person_id && e.person_type === p.person_type
      );
      const ros = roster.find(
        (r) => r.person_id === p.person_id && r.person_type === p.person_type && r.roster_date === date,
      );
      next[key] = {
        person_id: p.person_id,
        person_type: p.person_type,
        status: status || 'P',
        remarks: found?.remarks || '',
        check_in: (found?.check_in || '').slice(0, 5),
        check_out: (found?.check_out || '').slice(0, 5),
        shift: ros?.shift || found?.shift || defaultActiveShift,
      };
    });
    setRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allPeople.length, existing.length, roster.length, defaultActiveShift]);

  const setRow = (key: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const grouped = useMemo(() => {
    const g = new Map<string, typeof allPeople>();
    allPeople.forEach((p) => {
      if (!g.has(p.group)) g.set(p.group, []);
      g.get(p.group)!.push(p);
    });
    return Array.from(g.entries());
  }, [allPeople]);

  const counts = useMemo(() => {
    const c = { P: 0, A: 0, L: 0, H: 0, O: 0, HOL: 0, LATE: 0 } as Record<
      AttendanceStatus,
      number
    >;
    Object.values(rows).forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [rows]);

  const markAllOff = () => {
    setRows((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => (next[k] = { ...next[k], status: 'O' }));
      return next;
    });
  };

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [reasonPrompt, setReasonPrompt] = useState<
    | { kind: 'row'; key: string; editCount: number }
    | { kind: 'bulk'; editCount: number }
    | null
  >(null);

  const isExistingRow = (key: string) => {
    const r = rows[key];
    if (!r) return false;
    return existing.some(
      (e) => e.person_id === r.person_id && e.person_type === r.person_type,
    );
  };

  type ReasonPayload = { code: string; note: string | null } | null;

  const submitRow = (key: string, reason: ReasonPayload) => {
    const r = rows[key];
    if (!r) return;
    const ev = evaluate(r.shift, r.check_in, r.check_out);
    const status: AttendanceStatus = r.status === 'P' && ev.isLate ? 'LATE' : r.status;
    setSavingKey(key);
    bulkSave.mutate(
      {
        attendance_date: date,
        edit_reason: reason?.note ?? null,
        edit_reason_code: reason?.code ?? null,
        records: [{
          person_id: r.person_id,
          person_type: r.person_type,
          status,
          remarks: r.remarks || null,
          check_in: r.check_in ? `${r.check_in}:00` : null,
          check_out: r.check_out ? `${r.check_out}:00` : null,
          shift: r.shift || null,
          hours_worked: ev.workedHours,
        }],
      },
      { onSettled: () => setSavingKey(null) },
    );
  };

  const handleSaveRow = (key: string) => {
    if (isExistingRow(key)) {
      setReasonPrompt({ kind: 'row', key, editCount: 1 });
    } else {
      submitRow(key, null);
    }
  };

  const submitBulk = (reason: ReasonPayload) => {
    const records = Object.values(rows).map((r) => {
      const ev = evaluate(r.shift, r.check_in, r.check_out);
      const status: AttendanceStatus = r.status === 'P' && ev.isLate ? 'LATE' : r.status;
      return {
        person_id: r.person_id,
        person_type: r.person_type,
        status,
        remarks: r.remarks || null,
        check_in: r.check_in ? `${r.check_in}:00` : null,
        check_out: r.check_out ? `${r.check_out}:00` : null,
        shift: r.shift || null,
        hours_worked: ev.workedHours,
      };
    });
    bulkSave.mutate({
      attendance_date: date,
      edit_reason: reason?.note ?? null,
      edit_reason_code: reason?.code ?? null,
      records,
    });
  };

  const handleSave = () => {
    const editCount = Object.keys(rows).filter((k) => isExistingRow(k)).length;
    if (editCount > 0) {
      setReasonPrompt({ kind: 'bulk', editCount });
    } else {
      submitBulk(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Department</label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Operators + Staff)</SelectItem>
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
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                Import Punch Report
              </Button>
              <Button variant="outline" size="sm" onClick={markAllOff}>
                <CheckCheck className="mr-1 h-4 w-4" />
                Mark all Off
              </Button>
              <Button onClick={handleSave} disabled={bulkSave.isPending}>
                <Save className="mr-1 h-4 w-4" />
                {bulkSave.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
            <span className="inline-flex items-center gap-1 text-sm font-medium">
              <Users className="h-4 w-4" />
              {allPeople.length} people
            </span>
            <span className="text-sm text-muted-foreground">
              P: <strong className="text-green-600">{counts.P}</strong> · A:{' '}
              <strong className="text-red-600">{counts.A}</strong> · L:{' '}
              <strong className="text-blue-600">{counts.L}</strong> · H:{' '}
              <strong className="text-amber-600">{counts.H}</strong> · O:{' '}
              <strong className="text-slate-500">{counts.O}</strong>
            </span>
            <div className="ml-auto">
              <AttendanceLegend />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        grouped.map(([groupName, list]) => (
          <Card key={groupName}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                {groupName}{' '}
                <span className="font-normal text-muted-foreground">({list.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-24 px-3 py-2 text-left">Code</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="w-32 px-3 py-2 text-left">Type</th>
                    <th className="w-28 px-3 py-2 text-left">Shift</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="w-28 px-3 py-2 text-left">Time In</th>
                    <th className="w-28 px-3 py-2 text-left">Time Out</th>
                    <th className="w-32 px-3 py-2 text-left">Hrs / OT</th>
                    <th className="w-48 px-3 py-2 text-left">Remarks</th>
                    <th className="w-20 px-2 py-2 text-left">Save</th>
                    {admin && <th className="w-12 px-2 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const key = `${p.person_type}:${p.person_id}`;
                    const row = rows[key];
                    if (!row) return null;
                    const ev = evaluate(row.shift, row.check_in, row.check_out);
                    return (
                      <tr key={key} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{p.code || '—'}</td>
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.sub}</td>
                        <td className="px-2 py-2">
                          <Select value={row.shift || defaultActiveShift} onValueChange={(v) => setRow(key, { shift: v })}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {shiftSettings.filter((s) => s.is_active).map((s) => (
                                <SelectItem key={s.id} value={s.shift_name}>
                                  {s.display_name || s.shift_name.charAt(0).toUpperCase() + s.shift_name.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <AttendanceStatusPicker
                              value={row.status}
                              onChange={(s) => setRow(key, { status: s })}
                            />
                            {ev.isLate && (row.status === 'P' || row.status === 'LATE') && (
                              <Badge variant="outline" className="border-orange-500 text-orange-700">
                                LATE +{ev.lateMinutes}m
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="time"
                            value={row.check_in}
                            onChange={(e) => setRow(key, { check_in: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="time"
                            value={row.check_out}
                            onChange={(e) => setRow(key, { check_out: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {ev.workedHours != null ? (
                            <div className="flex items-center gap-1">
                              <span>{ev.workedHours}h</span>
                              {ev.otHours > 0 && (
                                <Badge variant="outline" className="border-emerald-500 text-emerald-700">
                                  OT +{ev.otHours}h
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={row.remarks}
                            onChange={(e) => setRow(key, { remarks: e.target.value })}
                            placeholder="—"
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => handleSaveRow(key)}
                            disabled={savingKey === key && bulkSave.isPending}
                          >
                            <Save className="mr-1 h-3 w-3" />
                            {savingKey === key && bulkSave.isPending ? '…' : 'Save'}
                          </Button>
                        </td>
                        {admin && (
                          <td className="px-2 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Edit history"
                              onClick={() =>
                                setHistoryFor({
                                  person_id: p.person_id,
                                  person_type: p.person_type,
                                  name: p.name,
                                })
                              }
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}

      <ImportPunchReportDialog open={importOpen} onOpenChange={setImportOpen} />
      {historyFor && (
        <AttendanceEditHistoryDialog
          open={!!historyFor}
          onOpenChange={(v) => !v && setHistoryFor(null)}
          personId={historyFor.person_id}
          personType={historyFor.person_type}
          personName={historyFor.name}
          date={date}
        />
      )}
      {reasonPrompt && (
        <EditReasonDialog
          open={!!reasonPrompt}
          onOpenChange={(v) => !v && setReasonPrompt(null)}
          editCount={reasonPrompt.editCount}
          onConfirm={(reason) => {
            const p = reasonPrompt;
            setReasonPrompt(null);
            if (p.kind === 'row') submitRow(p.key, reason);
            else submitBulk(reason);
          }}
        />
      )}
    </div>
  );
}
