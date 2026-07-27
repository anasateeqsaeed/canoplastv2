import { Fragment, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer } from 'lucide-react';
import { AccountSelector } from '@/components/accounting/AccountSelector';
import { useTrialBalance, useProfitAndLoss, useBalanceSheet, useGeneralLedger } from '@/hooks/useAccountingReports';
import { useVouchers, VOUCHER_TYPES } from '@/hooks/useVouchers';
import { formatCurrencyFull } from '@/lib/currency';

const fmt = (n: number) => (Math.abs(n) < 0.005 ? '' : formatCurrencyFull(n));

export default function FinancialReportsPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yearStart = format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd');
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [glAccount, setGlAccount] = useState('');
  const [dayBookDate, setDayBookDate] = useState(today);

  const tb = useTrialBalance(from, to);
  const pnl = useProfitAndLoss(from, to);
  const bs = useBalanceSheet(to);
  const gl = useGeneralLedger(glAccount || undefined, from, to);
  const dayBook = useVouchers({ startDate: dayBookDate, endDate: dayBookDate });

  const tbLeaf = useMemo(() => (tb.data || []).filter((r) => !r.is_group), [tb.data]);
  const tbTotals = useMemo(
    () => ({
      debit: tbLeaf.reduce((s, r) => s + (Number(r.closing) > 0 ? Number(r.closing) : 0), 0),
      credit: tbLeaf.reduce((s, r) => s + (Number(r.closing) < 0 ? -Number(r.closing) : 0), 0),
    }),
    [tbLeaf],
  );

  const income = (pnl.data || []).filter((r) => r.account_type === 'income');
  const expense = (pnl.data || []).filter((r) => r.account_type === 'expense');
  const incomeTotal = income.reduce((s, r) => s + Number(r.amount), 0);
  const expenseTotal = expense.reduce((s, r) => s + Number(r.amount), 0);

  const bsSections = useMemo(() => {
    const rows = bs.data || [];
    return {
      asset: rows.filter((r) => r.section === 'asset'),
      liability: rows.filter((r) => r.section === 'liability'),
      equity: rows.filter((r) => r.section === 'equity'),
    };
  }, [bs.data]);
  const bsTotal = (rows: { amount: number }[]) => rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <MainLayout title="Financial Reports" subtitle="Trial Balance · P&L · Balance Sheet · General Ledger · Day Book">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To / As of</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} className="mr-1" /> Print / PDF
          </Button>
        </div>

        <Tabs defaultValue="trial-balance" className="space-y-4">
          <TabsList className="print:hidden">
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
            <TabsTrigger value="day-book">Day Book</TabsTrigger>
          </TabsList>

          <TabsContent value="trial-balance">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Closing Dr</TableHead>
                      <TableHead className="text-right">Closing Cr</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tbLeaf.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No posted entries in this range</TableCell></TableRow>
                    ) : (
                      <>
                        {tbLeaf.map((r) => (
                          <TableRow key={r.account_id}>
                            <TableCell className="font-mono text-xs">{r.code}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="text-right">{fmt(Number(r.opening))}</TableCell>
                            <TableCell className="text-right">{fmt(Number(r.period_debit))}</TableCell>
                            <TableCell className="text-right">{fmt(Number(r.period_credit))}</TableCell>
                            <TableCell className="text-right">{Number(r.closing) > 0 ? formatCurrencyFull(Number(r.closing)) : ''}</TableCell>
                            <TableCell className="text-right">{Number(r.closing) < 0 ? formatCurrencyFull(-Number(r.closing)) : ''}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold bg-muted/40">
                          <TableCell colSpan={5}>Totals</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(tbTotals.debit)}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(tbTotals.credit)}</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pnl">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    <TableRow className="font-semibold bg-muted/40"><TableCell colSpan={2}>Income</TableCell></TableRow>
                    {income.map((r) => (
                      <TableRow key={r.account_id}>
                        <TableCell className="pl-8">{r.code} — {r.name}</TableCell>
                        <TableCell className="text-right">{formatCurrencyFull(Number(r.amount))}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium">
                      <TableCell>Total Income</TableCell>
                      <TableCell className="text-right">{formatCurrencyFull(incomeTotal)}</TableCell>
                    </TableRow>
                    <TableRow className="font-semibold bg-muted/40"><TableCell colSpan={2}>Expenses</TableCell></TableRow>
                    {expense.map((r) => (
                      <TableRow key={r.account_id}>
                        <TableCell className="pl-8">{r.code} — {r.name}</TableCell>
                        <TableCell className="text-right">{formatCurrencyFull(Number(r.amount))}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium">
                      <TableCell>Total Expenses</TableCell>
                      <TableCell className="text-right">{formatCurrencyFull(expenseTotal)}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold text-base bg-muted/60">
                      <TableCell>Net {incomeTotal - expenseTotal >= 0 ? 'Profit' : 'Loss'}</TableCell>
                      <TableCell className="text-right">{formatCurrencyFull(Math.abs(incomeTotal - expenseTotal))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balance-sheet">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {(['asset', 'liability', 'equity'] as const).map((section) => (
                      <Fragment key={section}>
                        <TableRow className="font-semibold bg-muted/40">
                          <TableCell colSpan={2} className="capitalize">{section === 'asset' ? 'Assets' : section === 'liability' ? 'Liabilities' : 'Equity'}</TableCell>
                        </TableRow>
                        {bsSections[section].map((r) => (
                          <TableRow key={`${section}-${r.code}`}>
                            <TableCell className="pl-8">{r.code} — {r.name}</TableCell>
                            <TableCell className="text-right">{formatCurrencyFull(Number(r.amount))}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-medium">
                          <TableCell>Total {section === 'asset' ? 'Assets' : section === 'liability' ? 'Liabilities' : 'Equity'}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(bsTotal(bsSections[section]))}</TableCell>
                        </TableRow>
                      </Fragment>
                    ))}
                    <TableRow className="font-bold bg-muted/60">
                      <TableCell>Liabilities + Equity</TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyFull(bsTotal(bsSections.liability) + bsTotal(bsSections.equity))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general-ledger" className="space-y-4">
            <div className="w-96 print:hidden">
              <label className="text-xs text-muted-foreground">Account</label>
              <AccountSelector value={glAccount} onChange={setGlAccount} />
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Voucher</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!glAccount ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Pick an account</TableCell></TableRow>
                    ) : (
                      <>
                        <TableRow className="bg-muted/40">
                          <TableCell colSpan={5} className="font-medium">Opening balance</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrencyFull(gl.data?.opening ?? 0)}</TableCell>
                        </TableRow>
                        {(gl.data?.rows || []).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{format(new Date(row.entry_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="font-mono text-sm">{row.voucher_number}</TableCell>
                            <TableCell className="max-w-md truncate text-muted-foreground">{row.description || row.narration}</TableCell>
                            <TableCell className="text-right">{Number(row.debit) > 0 ? formatCurrencyFull(Number(row.debit)) : ''}</TableCell>
                            <TableCell className="text-right">{Number(row.credit) > 0 ? formatCurrencyFull(Number(row.credit)) : ''}</TableCell>
                            <TableCell className="text-right">{formatCurrencyFull(Number(row.running_balance))}</TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="day-book" className="space-y-4">
            <div className="w-44 print:hidden">
              <label className="text-xs text-muted-foreground">Date</label>
              <Input type="date" value={dayBookDate} onChange={(e) => setDayBookDate(e.target.value)} />
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Narration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dayBook.data || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No vouchers on this day</TableCell></TableRow>
                    ) : (
                      (dayBook.data || []).map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-sm">{v.voucher_number}</TableCell>
                          <TableCell>{VOUCHER_TYPES[v.voucher_type] || v.voucher_type}</TableCell>
                          <TableCell className="max-w-md truncate text-muted-foreground">{v.narration}</TableCell>
                          <TableCell className="capitalize">{v.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
