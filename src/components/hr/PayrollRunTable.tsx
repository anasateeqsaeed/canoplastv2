import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrencyFull as formatCurrency } from '@/lib/currency';
import {
  usePayrollItems,
  usePayrollRun,
  useUpdatePayrollItem,
  useFinalizePayrollRun,
  useMarkRunPaid,
  type PayrollItem,
} from '@/hooks/usePayroll';
import { calculatePayrollLine } from '@/hooks/usePayrollCalc';
import { useEmployeeTypes } from '@/hooks/useEmployeeTypes';
import { Lock, CheckCircle2, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  runId: string;
}

type EmployeeFilter = string; // 'all' or employee_type_id

export function PayrollRunTable({ runId }: Props) {
  const { data: run } = usePayrollRun(runId);
  const { data: items = [], isLoading } = usePayrollItems(runId);
  const { data: employeeTypes = [] } = useEmployeeTypes();
  const updateItem = useUpdatePayrollItem();
  const finalize = useFinalizePayrollRun();
  const markPaid = useMarkRunPaid();
  const [filter, setFilter] = useState<EmployeeFilter>('all');
  const [search, setSearch] = useState('');

  const locked = run?.status !== 'draft';

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter !== 'all' && (it.employee as any)?.employee_type_id !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${it.employee?.employee_code || ''} ${it.employee?.full_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filter, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, it) => {
        acc.gross += Number(it.gross_pay) || 0;
        acc.advance += Number(it.advance_deduction) || 0;
        acc.other += Number(it.other_deduction) || 0;
        acc.net += Number(it.net_pay) || 0;
        return acc;
      },
      { gross: 0, advance: 0, other: 0, net: 0 },
    );
  }, [filtered]);

  // Recalculate net when an editable field changes — done by recomputing via calc engine
  const handleEdit = async (
    it: PayrollItem,
    patch: { ot_hours?: number; advance_deduction?: number; other_deduction?: number; payment_mode?: 'cash' | 'bank' },
  ) => {
    if (locked) return;
    // Recompute gross/net using same formula
    const otHours = patch.ot_hours ?? Number(it.ot_hours);
    const otAmount = round2(otHours * Number(it.ot_rate));
    const grossPay = round2(Number(it.earned_basic) + Number(it.allowances_amount) + otAmount);
    const advanceDed = patch.advance_deduction ?? Number(it.advance_deduction);
    const otherDed = patch.other_deduction ?? Number(it.other_deduction);
    const netPay = round2(grossPay - advanceDed - otherDed);

    await updateItem.mutateAsync({
      id: it.id,
      runId,
      patch: {
        ot_hours: otHours,
        ot_amount: otAmount,
        gross_pay: grossPay,
        advance_deduction: advanceDed,
        other_deduction: otherDed,
        net_pay: netPay,
        payment_mode: patch.payment_mode ?? it.payment_mode,
      } as any,
    });
  };

  const exportBankList = () => {
    const rows = filtered.filter((it) => it.payment_mode === 'bank');
    if (rows.length === 0) {
      toast.error('No bank-paid employees in current view');
      return;
    }
    const lines = ['Code,Name,Bank,Account,Net Pay (PKR)'];
    rows.forEach((it) => {
      lines.push(
        [
          csv(it.employee?.employee_code),
          csv(it.employee?.full_name),
          csv(it.employee?.bank_name),
          csv(it.employee?.bank_account),
          Number(it.net_pay).toFixed(2),
        ].join(','),
      );
    });
    download(`bank-list-${run?.run_code || 'payroll'}.csv`, lines.join('\n'));
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading payroll items…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <SummaryTile label="Employees" value={filtered.length.toString()} />
        <SummaryTile label="Gross" value={formatCurrency(totals.gross)} />
        <SummaryTile label="Advance" value={formatCurrency(totals.advance)} />
        <SummaryTile label="Other Ded." value={formatCurrency(totals.other)} />
        <SummaryTile label="Net Payable" value={formatCurrency(totals.net)} highlight />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {employeeTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Badge variant="outline" className="ml-2 capitalize">
            Status: {run?.status}
          </Badge>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportBankList}>
              <FileDown className="h-4 w-4 mr-1" />
              Bank List CSV
            </Button>
            {run?.status === 'draft' && (
              <Button
                size="sm"
                onClick={() => finalize.mutate(runId)}
                disabled={finalize.isPending || items.length === 0}
              >
                <Lock className="h-4 w-4 mr-1" />
                Finalize
              </Button>
            )}
            {run?.status === 'finalized' && (
              <Button size="sm" onClick={() => markPaid.mutate(runId)} disabled={markPaid.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark All Paid
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Code</TableHead>
                <TableHead className="min-w-[140px]">Name</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">P/A/L/H</TableHead>
                <TableHead className="text-right">Pay Days</TableHead>
                <TableHead className="text-right">Daily</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Allow</TableHead>
                <TableHead className="text-right whitespace-nowrap">OT hrs × {''}</TableHead>
                <TableHead className="text-right">OT Amt</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Advance</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead className="text-right font-semibold">Net</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={17} className="text-center text-muted-foreground py-6">
                    No employees match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">{it.employee?.employee_code}</TableCell>
                  <TableCell className="font-medium">{it.employee?.full_name}</TableCell>
                  <TableCell className="text-xs">{it.employee?.departments?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {it.employee?.employee_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center whitespace-nowrap">
                    <span className="text-green-600">{it.days_present}</span>/
                    <span className="text-red-600">{it.days_absent}</span>/
                    <span className="text-blue-600">{it.days_leave}</span>/
                    <span className="text-amber-600">{it.days_half}</span>
                  </TableCell>
                  <TableCell className="text-right">{Number(it.payable_days).toFixed(1)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(it.daily_wage)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(it.earned_basic)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(it.allowances_amount)}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={it.ot_hours}
                      disabled={locked}
                      onChange={(e) => {
                        // local optimistic update only on blur
                      }}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== Number(it.ot_hours)) handleEdit(it, { ot_hours: v });
                      }}
                      defaultValue={it.ot_hours}
                      className="h-7 w-16 text-right text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(it.ot_amount)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(it.gross_pay)}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      defaultValue={it.advance_deduction}
                      disabled={locked}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== Number(it.advance_deduction)) handleEdit(it, { advance_deduction: v });
                      }}
                      className="h-7 w-20 text-right text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      defaultValue={it.other_deduction}
                      disabled={locked}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== Number(it.other_deduction)) handleEdit(it, { other_deduction: v });
                      }}
                      className="h-7 w-20 text-right text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    {formatCurrency(it.net_pay)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={it.payment_mode}
                      disabled={locked}
                      onValueChange={(v) => handleEdit(it, { payment_mode: v as 'cash' | 'bank' })}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={it.payment_status === 'paid' ? 'default' : 'outline'} className="text-xs">
                      {it.payment_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className={`text-base font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function csv(v: any) {
  const s = (v ?? '').toString();
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
