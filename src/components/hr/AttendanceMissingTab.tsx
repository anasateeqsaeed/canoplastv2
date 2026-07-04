import { useMemo, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { Download, Filter, AlertTriangle, ArrowUpRight, X } from 'lucide-react';
import { useAttendancePeople } from '@/hooks/useAttendancePeople';
import { useMissingAttendance } from '@/hooks/useMissingAttendance';

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
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AttendanceMissingTab() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [departmentId, setDepartmentId] = useState<string>('all');

  const { data: people = [] } = useAttendancePeople();
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((p) => {
      if (p.department_id && p.group) map.set(p.department_id, p.group);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [people]);

  const { rows, isLoading } = useMissingAttendance({ from, to, departmentId });

  const exportCsv = () => {
    const head = ['Date', 'Day', 'Code', 'Name', 'Type', 'Department'];
    const body = rows.map((r) => [r.date, r.weekday, r.code, r.name, r.person_type, r.group]);
    downloadCSV(`attendance-missing-${from}-to-${to}.csv`, [head, ...body]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
                <SelectItem value="__none__">No Department</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 col-span-2">
            <Button variant="outline" size="sm" onClick={() => { setFrom(monthStart); setTo(today); setDepartmentId('all'); }}>
              <X className="h-4 w-4 mr-1" /> Reset
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {isLoading ? 'Loading…' : `${rows.length} missing entr${rows.length === 1 ? 'y' : 'ies'}`}
            <span className="text-xs font-normal text-muted-foreground">
              (Fridays excluded — Pakistani work week)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="w-24">Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      All working days in this range are marked. 🎉
                    </TableCell>
                  </TableRow>
                )}
                {rows.slice(0, 1000).map((r, i) => (
                  <TableRow key={`${r.person_id}:${r.date}:${i}`}>
                    <TableCell className="text-xs whitespace-nowrap">{r.date}</TableCell>
                    <TableCell className="text-xs">{r.weekday}</TableCell>
                    <TableCell className="text-xs font-mono">{r.code || '—'}</TableCell>
                    <TableCell className="text-xs font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{r.person_type}</TableCell>
                    <TableCell className="text-xs">{r.group}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline" className="h-7">
                        <Link to={`/hr/attendance?date=${r.date}`}>
                          <ArrowUpRight className="h-3 w-3 mr-1" /> Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 1000 && (
              <p className="p-3 text-xs text-muted-foreground">
                Showing first 1000 of {rows.length}. Narrow filters or export CSV for the full list.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
