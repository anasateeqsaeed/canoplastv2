import { useMemo, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Filter, History, X } from 'lucide-react';
import { useAttendanceEditReasons } from '@/hooks/useAttendanceEditReasons';
import { useAttendanceEdits, summarizeChanges, type AttendanceEditRow } from '@/hooks/useAttendanceEdits';
import { useAttendancePeople } from '@/hooks/useAttendancePeople';
import { AttendanceEditHistoryDialog } from './AttendanceEditHistoryDialog';
import type { PersonType } from '@/hooks/useAttendance';

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = c == null ? '' : String(c);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AttendanceEditsTab() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [personId, setPersonId] = useState<string>('all');
  const [actorEmail, setActorEmail] = useState('');
  const [action, setAction] = useState<'all' | 'insert' | 'update'>('all');
  const [reasonCode, setReasonCode] = useState<string>('all');
  const [history, setHistory] = useState<{ person_id: string; person_type: PersonType; name: string; date: string } | null>(null);

  const { data: people = [] } = useAttendancePeople();
  const { data: reasons = [] } = useAttendanceEditReasons(false);
  const reasonsByCode = useMemo(() => {
    const m = new Map<string, string>();
    reasons.forEach((r) => m.set(r.code, r.label));
    return m;
  }, [reasons]);
  const peopleById = useMemo(() => {
    const m = new Map<string, (typeof people)[number]>();
    people.forEach((p) => m.set(p.person_id, p));
    return m;
  }, [people]);

  const { data: edits = [], isLoading } = useAttendanceEdits({
    dateFrom,
    dateTo,
    personId: personId === 'all' ? null : personId,
    actorEmail: actorEmail || null,
    action,
    reasonCode: reasonCode === 'all' ? null : reasonCode,
    limit: 1000,
  });

  const reset = () => {
    setDateFrom(monthStart);
    setDateTo(today);
    setPersonId('all');
    setActorEmail('');
    setAction('all');
    setReasonCode('all');
  };

  const exportCsv = () => {
    const head = ['Edited At', 'Editor', 'Action', 'Employee', 'Type', 'Date', 'Changes', 'Reason', 'Reason Note'];
    const body = edits.map((r) => {
      const p = peopleById.get(r.person_id);
      return [
        format(new Date(r.changed_at), 'yyyy-MM-dd HH:mm:ss'),
        r.actor_email || 'system',
        r.action,
        p?.name || r.person_id,
        r.person_type,
        r.attendance_date,
        summarizeChanges(r),
        (r.edit_reason_code && reasonsByCode.get(r.edit_reason_code)) || r.edit_reason_code || '',
        r.edit_reason || '',
      ];
    });
    downloadCSV(`attendance-edits-${dateFrom}-to-${dateTo}.csv`, [head, ...body]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Attendance from</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Attendance to</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Employee</Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All employees</SelectItem>
                {people.map((p) => (
                  <SelectItem key={`${p.person_type}:${p.person_id}`} value={p.person_id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Editor email contains</Label>
            <Input value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} placeholder="e.g. hr@" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="insert">Created (with time)</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reason</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All reasons</SelectItem>
                {reasons.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.label}{!r.is_active ? ' (inactive)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <X className="h-4 w-4 mr-1" /> Reset
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={edits.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            {isLoading ? 'Loading…' : `${edits.length} edit${edits.length === 1 ? '' : 's'}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">When edited</TableHead>
                  <TableHead>Editor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Attendance date</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && edits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No edits found for these filters.
                    </TableCell>
                  </TableRow>
                )}
                {edits.map((r) => {
                  const p = peopleById.get(r.person_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.changed_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs">{r.actor_email || 'system'}</TableCell>
                      <TableCell>
                        <Badge variant={r.action === 'insert' ? 'default' : 'outline'} className="text-xs capitalize">
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{p?.name || r.person_id}</div>
                        <div className="text-muted-foreground">{p?.code} · {r.person_type}</div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.attendance_date}</TableCell>
                      <TableCell className="text-xs">{summarizeChanges(r as AttendanceEditRow)}</TableCell>
                      <TableCell className="text-xs">
                        {r.edit_reason_code ? (
                          <div className="space-y-0.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {reasonsByCode.get(r.edit_reason_code) || r.edit_reason_code}
                            </Badge>
                            {r.edit_reason && (
                              <div className="text-muted-foreground">{r.edit_reason}</div>
                            )}
                          </div>
                        ) : r.edit_reason ? (
                          <span>{r.edit_reason}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Full history for this person + date"
                          onClick={() =>
                            setHistory({
                              person_id: r.person_id,
                              person_type: r.person_type as PersonType,
                              name: p?.name || r.person_id,
                              date: r.attendance_date,
                            })
                          }
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {history && (
        <AttendanceEditHistoryDialog
          open={!!history}
          onOpenChange={(v) => !v && setHistory(null)}
          personId={history.person_id}
          personType={history.person_type}
          personName={history.name}
          date={history.date}
        />
      )}
    </div>
  );
}
