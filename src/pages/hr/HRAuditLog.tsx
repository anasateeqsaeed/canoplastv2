import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { History, ChevronDown, ChevronRight, Filter, X } from 'lucide-react';
import {
  useHRAuditLog,
  diffSnapshots,
  type HRAuditEntityType,
} from '@/hooks/useHRAuditLog';
import { format } from 'date-fns';

const ENTITY_OPTIONS: { value: HRAuditEntityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All entities' },
  { value: 'employee', label: 'Employees' },
  { value: 'attendance_record', label: 'Attendance' },
  { value: 'payroll_run', label: 'Payroll Runs' },
  { value: 'payroll_item', label: 'Payroll Items' },
  { value: 'advance_recovery', label: 'Advances' },
  { value: 'department', label: 'Departments' },
];

const ENTITY_LABEL: Record<string, string> = {
  employee: 'Employee',
  attendance_record: 'Attendance',
  payroll_run: 'Payroll Run',
  payroll_item: 'Payroll Item',
  advance_recovery: 'Advance',
  department: 'Department',
};

export default function HRAuditLog() {
  const [entityType, setEntityType] = useState<HRAuditEntityType | 'all'>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const { data, isLoading } = useHRAuditLog({
    entity_type: entityType,
    from: from || undefined,
    to: to || undefined,
    limit: 500,
  });

  const reset = () => {
    setEntityType('all');
    setFrom('');
    setTo('');
  };

  return (
    <MainLayout
      title="HR Audit Trail"
      subtitle="Every create and update on HR data — who changed what and when"
    >
      <div className="space-y-4 p-4 md:p-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Entity</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              {isLoading ? 'Loading…' : `${data?.length ?? 0} entries`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>When</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!data || data.length === 0) && !isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No audit entries match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.map((entry) => (
                      <AuditRow key={entry.id} entry={entry} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function AuditRow({ entry }: { entry: any }) {
  const [open, setOpen] = useState(false);
  const changes = diffSnapshots(entry.before_data, entry.after_data);
  const summary =
    entry.action === 'insert'
      ? 'New record created'
      : changes.length === 0
      ? 'No tracked field changes'
      : `${changes.length} field${changes.length > 1 ? 's' : ''} changed`;

  return (
    <>
      <TableRow className="align-top">
        <TableCell className="py-2">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </TableCell>
        <TableCell className="text-xs whitespace-nowrap">
          {format(new Date(entry.changed_at), 'dd MMM yyyy HH:mm:ss')}
        </TableCell>
        <TableCell className="text-xs">{entry.actor_email ?? 'system'}</TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            {ENTITY_LABEL[entry.entity_type] ?? entry.entity_type}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={entry.action === 'insert' ? 'default' : 'outline'} className="text-xs capitalize">
            {entry.action === 'insert' ? 'created' : 'updated'}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{summary}</TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell />
          <TableCell colSpan={5} className="bg-muted/30">
            {entry.action === 'insert' ? (
              <pre className="text-xs whitespace-pre-wrap break-all max-h-64 overflow-auto bg-background border border-border rounded p-2">
                {JSON.stringify(entry.after_data, null, 2)}
              </pre>
            ) : changes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tracked field changes.</p>
            ) : (
              <div className="space-y-1.5">
                {changes.map((c) => (
                  <div key={c.key} className="grid grid-cols-[140px_1fr_1fr] gap-2 text-xs items-start">
                    <div className="font-medium text-foreground">{c.key}</div>
                    <div className="text-destructive break-all">
                      {c.before === null || c.before === undefined ? '—' : String(typeof c.before === 'object' ? JSON.stringify(c.before) : c.before)}
                    </div>
                    <div className="text-success break-all">
                      {c.after === null || c.after === undefined ? '—' : String(typeof c.after === 'object' ? JSON.stringify(c.after) : c.after)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">
              Entity ID: <code>{entry.entity_id}</code>
            </p>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
