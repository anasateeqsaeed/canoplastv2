import { useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Check, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useLeaveApplications, useLeaveBalances, useUpdateLeaveStatus, useLeaveTypes } from '@/hooks/useLeave';
import { useEmployees } from '@/hooks/useEmployees';
import { LeaveApplicationDialog } from '@/components/hr/LeaveApplicationDialog';

const statusVariant = (s: string): any =>
  s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : s === 'cancelled' ? 'secondary' : 'outline';

export default function Leave() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = usePersistedState('leave.status', 'all');
  const year = new Date().getFullYear();

  const { data: apps = [] } = useLeaveApplications({ status: statusFilter });
  const { data: balances = [] } = useLeaveBalances(year);
  const { data: types = [] } = useLeaveTypes();
  const { data: employees = [] } = useEmployees();
  const updateMut = useUpdateLeaveStatus();

  // pivot balances: employee × type
  const balByEmpType = new Map<string, number>();
  balances.forEach(b => balByEmpType.set(`${b.employee_id}:${b.leave_type_id}`, b.allocated - b.used));

  return (
    <MainLayout title="Leave Management" subtitle="Apply, approve and track employee leave">
      <div className="space-y-4 p-4 md:p-6">
        <Tabs defaultValue="apps">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="apps"><Calendar className="mr-1 h-4 w-4" />Applications</TabsTrigger>
              <TabsTrigger value="bal">Balances ({year})</TabsTrigger>
            </TabsList>
            <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />New Application</Button>
          </div>

          <TabsContent value="apps" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm" style={{ minWidth: 900 }}>
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">From</th>
                      <th className="px-3 py-2 text-left">To</th>
                      <th className="px-3 py-2 text-right">Days</th>
                      <th className="px-3 py-2 text-left">Reason</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.length === 0 && (
                      <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No leave applications</td></tr>
                    )}
                    {apps.map(a => (
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{a.employee?.full_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{a.employee?.employee_code}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span style={{ color: a.leave_type?.color }}>● </span>
                          {a.leave_type?.name}
                          {a.leave_type && !a.leave_type.is_paid && <Badge variant="outline" className="ml-1 text-xs">Unpaid</Badge>}
                        </td>
                        <td className="px-3 py-2">{format(new Date(a.from_date), 'dd MMM yyyy')}</td>
                        <td className="px-3 py-2">{format(new Date(a.to_date), 'dd MMM yyyy')}</td>
                        <td className="px-3 py-2 text-right font-mono">{a.days}</td>
                        <td className="px-3 py-2 max-w-xs truncate" title={a.reason || ''}>{a.reason || '—'}</td>
                        <td className="px-3 py-2"><Badge variant={statusVariant(a.status)}>{a.status}</Badge></td>
                        <td className="px-3 py-2 text-right">
                          {a.status === 'pending' && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="default" onClick={() => updateMut.mutate({ id: a.id, status: 'approved' })}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateMut.mutate({ id: a.id, status: 'rejected' })}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {a.status === 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: a.id, status: 'cancelled' })}>
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bal" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Leave Balances — {year}</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm" style={{ minWidth: 700 }}>
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Employee</th>
                      {types.map(t => (
                        <th key={t.id} className="px-3 py-2 text-right" style={{ color: t.color }}>{t.code}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.filter((e: any) => e.is_active).map((e: any) => (
                      <tr key={e.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{e.full_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{e.employee_code}</div>
                        </td>
                        {types.map(t => {
                          const remaining = balByEmpType.get(`${e.id}:${t.id}`);
                          const display = remaining !== undefined ? remaining : t.annual_quota;
                          return (
                            <td key={t.id} className="px-3 py-2 text-right font-mono">
                              {display}
                              <span className="text-xs text-muted-foreground"> / {t.annual_quota}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <LeaveApplicationDialog open={open} onOpenChange={setOpen} />
      </div>
    </MainLayout>
  );
}
