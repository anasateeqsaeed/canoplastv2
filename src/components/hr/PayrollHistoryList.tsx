import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrencyFull as formatCurrency } from '@/lib/currency';
import { usePayrollRuns, useDeletePayrollRun, type PayrollRun } from '@/hooks/usePayroll';
import { Trash2, Eye } from 'lucide-react';

interface Props {
  onOpen: (run: PayrollRun) => void;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  finalized: 'secondary',
  paid: 'default',
};

export function PayrollHistoryList({ onOpen }: Props) {
  const { data: runs = [], isLoading } = usePayrollRuns();
  const del = useDeletePayrollRun();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (runs.length === 0)
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No payroll runs yet. Use the "Generate" button above to create one.
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run Code</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.run_code}</TableCell>
                <TableCell>{format(parseISO(r.period_month), 'MMM yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status] || 'outline'} className="capitalize">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(r.total_gross)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.total_deductions)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(r.total_net)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(parseISO(r.created_at), 'dd MMM yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => onOpen(r)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {r.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete draft ${r.run_code}? This cannot be undone.`)) {
                          del.mutate(r.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
