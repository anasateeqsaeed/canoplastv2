import { format, startOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownCircle, ArrowUpCircle, Banknote, BookOpen, Landmark, Scale } from 'lucide-react';
import { useVouchers, VOUCHER_TYPES } from '@/hooks/useVouchers';
import { useProfitAndLoss, useArAging, useApAging, useTrialBalance } from '@/hooks/useAccountingReports';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { formatCurrency } from '@/lib/currency';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  posted: 'default',
  reversed: 'destructive',
};

export default function AccountingDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const pnl = useProfitAndLoss(monthStart, today);
  const arAging = useArAging(today);
  const apAging = useApAging(today);
  const tb = useTrialBalance('1900-01-01', today);
  const { data: accounts = [] } = useChartOfAccounts();
  const { data: banks = [] } = useBankAccounts();
  const recent = useVouchers({});

  const incomeMtd = (pnl.data || []).filter((r) => r.account_type === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const expenseMtd = (pnl.data || []).filter((r) => r.account_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
  const receivable = (arAging.data || []).reduce((s, r) => s + Number(r.total_outstanding), 0);
  const payable = (apAging.data || []).reduce((s, r) => s + Number(r.total_outstanding), 0);

  const balances = new Map((tb.data || []).map((r) => [r.account_id, Number(r.closing)]));
  const cashAccount = accounts.find((a) => a.system_key === 'CASH_IN_HAND');
  const cashAndBank =
    (cashAccount ? balances.get(cashAccount.id) || 0 : 0) +
    banks.reduce((s, b) => s + (balances.get(b.coa_account_id) || 0), 0);

  const cards = [
    { label: 'Income (this month)', value: incomeMtd, icon: <ArrowUpCircle className="text-green-600" size={20} /> },
    { label: 'Expenses (this month)', value: expenseMtd, icon: <ArrowDownCircle className="text-red-500" size={20} /> },
    { label: 'Total Receivable', value: receivable, icon: <Scale className="text-blue-500" size={20} />, to: '/accounting/receivables' },
    { label: 'Total Payable', value: payable, icon: <Banknote className="text-orange-500" size={20} />, to: '/accounting/payables' },
    { label: 'Cash & Bank', value: cashAndBank, icon: <Landmark className="text-primary" size={20} />, to: '/accounting/bank' },
  ];

  return (
    <MainLayout title="Accounting" subtitle="Double-entry ledger — every rupee accounted for">
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <Card key={c.label} className={c.to ? 'hover:border-primary/50 transition-colors' : undefined}>
              {c.to ? (
                <Link to={c.to}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
                    {c.icon}
                  </CardHeader>
                  <CardContent className="text-xl font-bold">{formatCurrency(c.value)}</CardContent>
                </Link>
              ) : (
                <>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
                    {c.icon}
                  </CardHeader>
                  <CardContent className="text-xl font-bold">{formatCurrency(c.value)}</CardContent>
                </>
              )}
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen size={18} /> Recent Vouchers
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/accounting/journal-entries">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recent.data || []).slice(0, 10).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.voucher_number}</TableCell>
                    <TableCell>{format(new Date(v.voucher_date), 'dd MMM')}</TableCell>
                    <TableCell>{VOUCHER_TYPES[v.voucher_type] || v.voucher_type}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">{v.narration}</TableCell>
                    <TableCell><Badge variant={statusVariant[v.status]}>{v.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {(recent.data || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No vouchers yet — start with opening balances (OB voucher) from Journal Entries
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
