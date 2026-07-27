import { useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, LockOpen, Plus } from 'lucide-react';
import { useFiscalYears, useSetPeriodStatus, useCreateFiscalYear } from '@/hooks/useFiscalPeriods';
import { useAuth } from '@/hooks/useAuth';

export default function FiscalPeriodsPage() {
  const { data: years = [], isLoading } = useFiscalYears();
  const setStatus = useSetPeriodStatus();
  const createYear = useCreateFiscalYear();
  const { roles } = useAuth();
  const canLock = roles.includes('admin') || roles.includes('finance_manager');
  const [newYear, setNewYear] = useState('');

  return (
    <MainLayout title="Fiscal Periods" subtitle="Close a month to block back-dated entries (calendar-year fiscal years)">
      <div className="space-y-6">
        {canLock && (
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Add fiscal year</label>
              <Input
                type="number" placeholder="2027" className="w-32"
                value={newYear} onChange={(e) => setNewYear(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={!/^\d{4}$/.test(newYear) || createYear.isPending}
              onClick={() => createYear.mutate(parseInt(newYear, 10), { onSuccess: () => setNewYear('') })}
            >
              <Plus size={16} className="mr-1" /> Create
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          years.map((fy) => (
            <Card key={fy.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-3">
                  {fy.year_label}
                  <Badge variant={fy.status === 'open' ? 'default' : 'destructive'}>{fy.status}</Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    {format(new Date(fy.start_date), 'dd MMM yyyy')} — {format(new Date(fy.end_date), 'dd MMM yyyy')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Status</TableHead>
                      {canLock && <TableHead className="w-32" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fy.accounting_periods || []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(p.start_date), 'dd MMM')} — {format(new Date(p.end_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'open' ? 'default' : 'destructive'}>{p.status}</Badge>
                        </TableCell>
                        {canLock && (
                          <TableCell>
                            {p.status === 'open' ? (
                              <Button
                                size="sm" variant="outline" disabled={setStatus.isPending}
                                onClick={() => setStatus.mutate({ periodId: p.id, status: 'closed' })}
                              >
                                <Lock size={14} className="mr-1" /> Lock
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="ghost" disabled={setStatus.isPending}
                                onClick={() => setStatus.mutate({ periodId: p.id, status: 'open' })}
                              >
                                <LockOpen size={14} className="mr-1" /> Re-open
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </MainLayout>
  );
}
