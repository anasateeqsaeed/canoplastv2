import { useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Upload } from 'lucide-react';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { ReceiptDialog } from '@/components/accounting/ReceiptDialog';
import { useArReceipts, useMarkArChequeBounced, useUpdateChequeStatus, useUnpostedInvoices, usePostInvoiceToGl } from '@/hooks/useArReceipts';
import { usePartyLedger, useArAging } from '@/hooks/useAccountingReports';
import { formatCurrencyFull } from '@/lib/currency';
import { toast } from 'sonner';

const chequeBadge: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  cleared: 'default',
  bounced: 'destructive',
};

export default function ReceivablesPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [ledgerClient, setLedgerClient] = useState('');
  const [ledgerFrom, setLedgerFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [ledgerTo, setLedgerTo] = useState(today);

  const { data: receipts = [], isLoading: receiptsLoading } = useArReceipts();
  const { data: unposted = [] } = useUnpostedInvoices();
  const { data: aging = [] } = useArAging(today);
  const ledger = usePartyLedger('client', ledgerClient || undefined, ledgerFrom, ledgerTo);
  const markBounced = useMarkArChequeBounced();
  const markCleared = useUpdateChequeStatus('ar_receipts');
  const postInvoice = usePostInvoiceToGl();

  const postAll = async () => {
    let ok = 0;
    for (const inv of unposted) {
      try {
        await postInvoice.mutateAsync(inv.id);
        ok += 1;
      } catch {
        break; // error already toasted by the hook
      }
    }
    if (ok > 0) toast.success(`${ok} invoice${ok > 1 ? 's' : ''} posted to GL`);
  };

  const agingTotal = aging.reduce((s, r) => s + Number(r.total_outstanding), 0);

  return (
    <MainLayout title="Receivables" subtitle="Customer invoices, receipts, ledgers and aging">
      <Tabs defaultValue="receipts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="invoices">Invoice GL Posting {unposted.length > 0 && `(${unposted.length})`}</TabsTrigger>
          <TabsTrigger value="ledger">Customer Ledger</TabsTrigger>
          <TabsTrigger value="aging">Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setReceiptOpen(true)}>
              <Plus size={16} className="mr-1" /> New Receipt
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Cheque</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-40" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptsLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : receipts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No receipts yet</TableCell></TableRow>
                  ) : (
                    receipts.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.receipt_number}</TableCell>
                        <TableCell>{format(new Date(r.receipt_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{r.clients?.name}</TableCell>
                        <TableCell className="capitalize">{r.mode}</TableCell>
                        <TableCell>
                          {r.mode === 'cheque' && (
                            <span className="flex items-center gap-2">
                              {r.cheque_number}
                              {r.cheque_status && <Badge variant={chequeBadge[r.cheque_status]}>{r.cheque_status}</Badge>}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyFull(Number(r.amount))}</TableCell>
                        <TableCell>
                          {r.mode === 'cheque' && r.cheque_status === 'pending' && (
                            <span className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => markCleared.mutate({ id: r.id, status: 'cleared' })}>
                                Cleared
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => markBounced.mutate(r.id)}>
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

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Issued invoices not yet posted to the general ledger (Dr Trade Debtors / Cr Sales Income + GST).
            </p>
            <Button disabled={unposted.length === 0 || postInvoice.isPending} onClick={postAll}>
              <Upload size={16} className="mr-1" /> Post all to GL
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unposted.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">All issued invoices are posted to the GL</TableCell></TableRow>
                  ) : (
                    unposted.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{inv.clients?.name}</TableCell>
                        <TableCell className="text-right">{formatCurrencyFull(Number(inv.total_amount))}</TableCell>
                        <TableCell>
                          <Button
                            size="sm" variant="outline" disabled={postInvoice.isPending}
                            onClick={() =>
                              postInvoice.mutate(inv.id, { onSuccess: () => toast.success(`${inv.invoice_number} posted`) })
                            }
                          >
                            Post
                          </Button>
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
              <label className="text-xs text-muted-foreground">Customer</label>
              <ClientSelector value={ledgerClient} onChange={setLedgerClient} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={ledgerFrom} onChange={(e) => setLedgerFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={ledgerTo} onChange={(e) => setLedgerTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" onClick={() => window.print()} disabled={!ledgerClient}>Print / PDF</Button>
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
                  {!ledgerClient ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Pick a customer to see their statement</TableCell></TableRow>
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
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">0–30 days</TableHead>
                    <TableHead className="text-right">31–60</TableHead>
                    <TableHead className="text-right">61–90</TableHead>
                    <TableHead className="text-right">90+</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aging.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nothing outstanding 🎉</TableCell></TableRow>
                  ) : (
                    <>
                      {aging.map((r) => (
                        <TableRow key={r.client_id}>
                          <TableCell>{r.client_name}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(Number(r.current_0_30))}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(Number(r.days_31_60))}</TableCell>
                          <TableCell className="text-right">{formatCurrencyFull(Number(r.days_61_90))}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrencyFull(Number(r.days_over_90))}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrencyFull(Number(r.total_outstanding))}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/40">
                        <TableCell>Total receivable</TableCell>
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

      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} />
    </MainLayout>
  );
}
