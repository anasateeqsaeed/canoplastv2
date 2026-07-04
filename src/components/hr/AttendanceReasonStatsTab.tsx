import { useMemo, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Settings2, TrendingUp, UserX } from 'lucide-react';
import {
  useAttendanceEditReasons,
  useReasonStats,
} from '@/hooks/useAttendanceEditReasons';
import { useAttendancePeople } from '@/hooks/useAttendancePeople';
import { ManageEditReasonsDialog } from './ManageEditReasonsDialog';

function csv(filename: string, rows: (string | number)[][]) {
  const text = rows.map((r) => r.map((c) => {
    const s = c == null ? '' : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function AttendanceReasonStatsTab() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [threshold, setThreshold] = useState(3);
  const [manageOpen, setManageOpen] = useState(false);

  const { data: raw = [], isLoading } = useReasonStats({
    dateFrom: `${dateFrom}T00:00:00`,
    dateTo: `${dateTo}T23:59:59`,
  });
  const { data: reasons = [] } = useAttendanceEditReasons(false);
  const { data: people = [] } = useAttendancePeople();

  const reasonLabel = (code: string) =>
    reasons.find((r) => r.code === code)?.label || code;
  const personName = (id: string) =>
    people.find((p) => p.person_id === id)?.name || id;

  // Aggregate by reason
  const byReason = useMemo(() => {
    const m = new Map<string, { count: number; employees: Set<string>; editors: Set<string>; last: string }>();
    raw.forEach((r) => {
      const key = r.edit_reason_code;
      const cur = m.get(key) || { count: 0, employees: new Set(), editors: new Set(), last: r.changed_at };
      cur.count++;
      cur.employees.add(r.person_id);
      if (r.actor_id) cur.editors.add(r.actor_id);
      if (r.changed_at > cur.last) cur.last = r.changed_at;
      m.set(key, cur);
    });
    return Array.from(m.entries())
      .map(([code, v]) => ({
        code,
        label: reasonLabel(code),
        count: v.count,
        employees: v.employees.size,
        editors: v.editors.size,
        last: v.last,
      }))
      .sort((a, b) => b.count - a.count);
  }, [raw, reasons]);

  // Repeat employee × reason
  const repeats = useMemo(() => {
    const m = new Map<string, { person_id: string; code: string; count: number; first: string; last: string; editors: Set<string> }>();
    raw.forEach((r) => {
      const key = `${r.person_id}__${r.edit_reason_code}`;
      const cur = m.get(key);
      if (cur) {
        cur.count++;
        if (r.changed_at < cur.first) cur.first = r.changed_at;
        if (r.changed_at > cur.last) cur.last = r.changed_at;
        if (r.actor_id) cur.editors.add(r.actor_id);
      } else {
        const editors = new Set<string>();
        if (r.actor_id) editors.add(r.actor_id);
        m.set(key, {
          person_id: r.person_id,
          code: r.edit_reason_code,
          count: 1,
          first: r.changed_at,
          last: r.changed_at,
          editors,
        });
      }
    });
    return Array.from(m.values())
      .filter((v) => v.count >= threshold)
      .sort((a, b) => b.count - a.count);
  }, [raw, threshold]);

  const maxCount = byReason[0]?.count || 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Repeat threshold</Label>
                <Input type="number" min={2} value={threshold} onChange={(e) => setThreshold(Math.max(2, +e.target.value || 2))} className="w-24" />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" /> Manage reasons
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> By reason
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={byReason.length === 0}
            onClick={() =>
              csv(`reason-summary-${dateFrom}-to-${dateTo}.csv`, [
                ['Reason', 'Code', 'Edits', 'Distinct employees', 'Distinct editors', 'Last used'],
                ...byReason.map((r) => [r.label, r.code, r.count, r.employees, r.editors, r.last]),
              ])
            }
          >
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Edits</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Editors</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="whitespace-nowrap">Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && byReason.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No reasoned edits in this range.</TableCell></TableRow>
              )}
              {byReason.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="text-sm font-medium">{r.label}</TableCell>
                  <TableCell className="text-right text-sm">{r.count}</TableCell>
                  <TableCell className="text-right text-sm">{r.employees}</TableCell>
                  <TableCell className="text-right text-sm">{r.editors}</TableCell>
                  <TableCell>
                    <div className="h-2 w-32 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(r.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(r.last), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <UserX className="h-4 w-4" /> Repeat patterns (≥ {threshold})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={repeats.length === 0}
            onClick={() =>
              csv(`reason-repeats-${dateFrom}-to-${dateTo}.csv`, [
                ['Employee', 'Reason', 'Code', 'Count', 'First', 'Last', 'Distinct editors'],
                ...repeats.map((r) => [
                  personName(r.person_id),
                  reasonLabel(r.code),
                  r.code,
                  r.count,
                  r.first,
                  r.last,
                  r.editors.size,
                ]),
              ])
            }
          >
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead>First</TableHead>
                <TableHead>Last</TableHead>
                <TableHead className="text-right">Editors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repeats.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No employee hit the repeat threshold.</TableCell></TableRow>
              )}
              {repeats.map((r) => (
                <TableRow key={`${r.person_id}-${r.code}`}>
                  <TableCell className="text-sm font-medium">{personName(r.person_id)}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{reasonLabel(r.code)}</Badge></TableCell>
                  <TableCell className="text-right text-sm font-semibold">{r.count}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.first), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.last), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right text-sm">{r.editors.size}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ManageEditReasonsDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}
