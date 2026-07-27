import { useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { SupplierSelector } from '@/components/selectors/SupplierSelector';
import { BillDialog } from '@/components/accounting/BillDialog';
import { PaymentDialog } from '@/components/accounting/PaymentDialog';
import { useApBills, useApPayments, usePostApBill, useDeleteApBill, useMarkApChequeBounced } from '@/hooks/useApBills';
import { useUpdateChequeStatus } from '@/hooks/useArReceipts';
import { usePartyLedger, useApAging } from '@/hooks/useAccountingReports';
import { formatCurrencyFull } from '@/lib/currency';

const chequeBadge: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  cleared: 'default',
  bounced: 'destructive',
};

const payBadge: Record<string, 'default' | 'secondary' | 'destructive'> = {
  paid: 'default',
  partial: 'secondary',
  unpaid: 'destructive',
};

export default function PayablesPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [billOpen, setBillOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [ledgerSupplier, setLedgerSupplier] = useState('');
  const [ledgerFrom, setLedgerFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [ledgerTo, setLedgerTo] = useState(today);

  const { data: bills = [], isLoading: billsLoading } = useApBills();
  const { data: payments = [], isLoading: paymentsLoading } = useApPayments();
  const { data: aging = [] } = useApAging(today);
  const ledger = usePartyLedger('supplier', ledgerSupplier || undefined, ledgerFrom, ledgerTo);
  const postBill = usePostApBill();
  const deleteBill = useDeleteApBill();
  const markBounced = useMarkApChequeBounced();
  const markCleared = useUpdateChequeStatus('ap_payments');

  const agingTotal = aging.reduce((s, r) => s + Number(r.total_outstanding), 0);

  return (
    <MainLayout title="Payables" subtitle="Vendor bills, payments, ledgers and aging">
      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="ledger">Vendor Ledger</TabsTrigger>
          <TabsTrigger value="aging">Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBillOpen(true)}>
              <Plus size={16} className="mr-1" /> New Bill
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Vendor Ref</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billsLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : bills.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bills yet</TableCell></TableRow>
                  ) : (
                    bills.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-sm">{b.bill_number}</TableCell>
                        <TableCell>{format(new Date(b.bill_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{b.suppliers?.name}</TableCell>
                        <TableCell className="text-muted-foreground">{b.vendor_bill_no}</TableCell>
                        <TableCell>
                          <Badge variant={b.status === 'posted' ? 'default' : 'secondary'}>{b.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {b.status === 'posted' && <Badge variant={payBadge[b.payment_status]}>{b.payment_status}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyFull(Number(b.total_amount))}</TableCell>
                        <TableCell className="text-right">
                          {b.status === 'posted' ? formatCurrencyFull(Number(b.total_amount) - Number(b.amount_paid)) : '—'}
                        </TableCell>
                        <TableCell>
                          {b.status === 'draft' && (
                            <span className="flex gap-1">
                              <Button size="sm" variant="outline" disabled={postBill.isPending} onClick={() => postBill.mutate(b.id)}>
                                Post
                              </Button>
                              <Button size="sm" variant="destructive" disabled={deleteBill.isPending} onClick={() => deleteBill.mutate(b.id)}>
                                Delete
                              </Button>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPaymentOpen(true)}>
              <Plus size={16} className="mr-1" /> New Payment
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Cheque</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments yet</TableCell></TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">{p.payment_number}</TableCell>
                        <TableCell>{format(new Date(p.payment_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{p.suppliers?.name}</TableCell>
                        <TableCell className="capitalize">{p.mode}</TableCell>
                        <TableCell>
                          {p.mode === 'cheque' && (
                            <span className="flex items-center gap-2">
                              {p.cheque_number}
                              {p.cheque_status && <Badge variant={chequeBadge[p.cheque_status]}>{p.cheque_status}</Badge>}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyFull(Number(p.amount))}</TableCell>
                        <TableCell>
                          {p.mode === 'cheque' && p.cheque_status === 'pending' && (
                            <span className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => markCleared.mutate({ id: p.id, status: 'cleared' })}>
                                Cleared
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => markBounced.mutate(p.id)}>
                                Bounced
                              </Button>
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-72">
              <label className="text-xs text-muted-foreground">Supplier</label>
              <SupplierSelector value={ledgerSupplier} onChange={setLedgerSupplier} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={ledgerFrom} onChange={(e) => setLedgerFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={ledgerTo} onChange={(e) => setLedgerTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" onClick={() => window.print()} disabled={!ledgerSupplier}>Print / PDF</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!ledgerSupplier ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Pick a supplier to see their statement</TableCell></TableRow>
                  ) : (
                    <>
                      <TableRow className="bg-muted/40">
                        <TableCell colSpan={5} className="font-medium">Opening balance</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrencyFull(ledger.data?.opening ?? 0)}</TableCell>
                      </TableRow>
                      {(ledger.data?.rows || []).map((row, i) => (
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

        <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">0–30 days</TableHead>
                    <TableHead className="text-right">31–60</TableHead>
                    <TableHead className="text-right">61–90</TableHead>
                    <TableHead className="text-right">90+</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aging.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nothing outstanding</TableCell></TableRow>
                  ) : (
                    <>
                      {aging.map((r) => (
                        <TableRow key={r.supplier_id}>
                          <TableCell>{r.supplier_name}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(Number(r.current_0_30))}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(Number(r.days_31_60))}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(Number(r.days_61_90))}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrencyFull(Number(r.days_over_90))}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrencyFull(Number(r.total_outstanding))}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/40">
                        <TableCell>Total payable</TableCell>
                        <TableCell colSpan={4} />
                        <TableCell className="text-right">{formatCurrencyFull(agingTotal)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BillDialog open={billOpen} onOpenChange={setBillOpen} />
      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} />
    </MainLayout>
  );
}
