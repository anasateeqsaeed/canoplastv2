import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { useClientProductLedger, useClientAccountStatement } from '@/hooks/useSalesReturns';
import { SalesReturnDialog } from '@/components/sales/SalesReturnDialog';

const docLabel: Record<string, string> = { invoice: 'Invoice', credit_note: 'Credit Note', receipt: 'Receipt' };

export default function CustomerLedgerPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['admin', 'sales_manager', 'store_incharge']);

  const clientId = params.get('client') || '';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const setClient = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('client', id); else next.delete('client');
    setParams(next, { replace: true });
  };

  const { data: products = [], isLoading: loadingProducts, error: productErr } = useClientProductLedger(clientId || undefined, from, to);
  const { data: statement = [], isLoading: loadingStmt, error: stmtErr } = useClientAccountStatement(clientId || undefined, from, to);

  const qtyTotals = useMemo(
    () =>
      products.reduce(
        (a, r) => ({
          out: a.out + r.dispatched_qty,
          back: a.back + r.dispatch_returned_qty + r.sales_returned_qty,
          net: a.net + r.net_qty,
          credited: a.credited + r.credited_value,
        }),
        { out: 0, back: 0, net: 0, credited: 0 },
      ),
    [products],
  );
  const moneyTotals = useMemo(
    () =>
      statement.reduce(
        (a, r) => ({
          invoiced: a.invoiced + (r.doc_type === 'invoice' ? r.debit : 0),
          credited: a.credited + (r.doc_type === 'credit_note' ? r.credit : 0),
          received: a.received + (r.doc_type === 'receipt' ? r.credit : 0),
        }),
        { invoiced: 0, credited: 0, received: 0 },
      ),
    [statement],
  );
  const balance = statement.length ? statement[statement.length - 1].balance : 0;

  const openDoc = (r: { doc_type: string; doc_id: string }) => {
    if (r.doc_type === 'invoice') navigate(`/sales/invoices/${r.doc_id}`);
    if (r.doc_type === 'credit_note') navigate(`/sales/returns/${r.doc_id}`);
  };

  return (
    <MainLayout title="Customer Ledger" subtitle="Product-wise quantity account and money account per customer">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-80">
            <Label>Customer</Label>
            <ClientSelector value={clientId} onChange={setClient} />
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          {(from || to) && <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>All time</Button>}
          {canManage && clientId && (
            <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
              <Plus size={16} className="mr-2" /> New Return for this customer
            </Button>
          )}
        </div>

        {!clientId ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">Select a customer to see their account.</CardContent></Card>
        ) : (
          <Tabs defaultValue="products">
            <TabsList>
              <TabsTrigger value="products"><Package size={14} className="mr-1" /> Product quantities</TabsTrigger>
              <TabsTrigger value="money"><Wallet size={14} className="mr-1" /> Account statement</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Dispatched (pcs)</div><div className="text-2xl font-semibold">{qtyTotals.out.toLocaleString()}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Returned (pcs)</div><div className="text-2xl font-semibold">{qtyTotals.back.toLocaleString()}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net with customer (pcs)</div><div className="text-2xl font-semibold text-primary">{qtyTotals.net.toLocaleString()}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Credited for returns</div><div className="text-2xl font-semibold">{formatCurrency(qtyTotals.credited, { compact: false })}</div></CardContent></Card>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[1000px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Dispatched</TableHead>
                          <TableHead className="text-right">Returned (per DC)</TableHead>
                          <TableHead className="text-right">Returned (credit note)</TableHead>
                          <TableHead className="text-right">Net with customer</TableHead>
                          <TableHead className="text-right">Dispatched value</TableHead>
                          <TableHead className="text-right">Credited value</TableHead>
                          <TableHead>Last dispatch</TableHead>
                          <TableHead>Last return</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingProducts ? (
                          <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                        ) : productErr ? (
                          <TableRow><TableCell colSpan={9} className="text-center py-6 text-destructive">{(productErr as Error).message}</TableCell></TableRow>
                        ) : products.length === 0 ? (
                          <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No dispatches or returns for this customer in the range.</TableCell></TableRow>
                        ) : products.map((r) => (
                          <TableRow key={r.product_id}>
                            <TableCell>
                              <div className="font-medium">{r.product_name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{r.product_code}</div>
                            </TableCell>
                            <TableCell className="text-right">{r.dispatched_qty.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{r.dispatch_returned_qty ? r.dispatch_returned_qty.toLocaleString() : '—'}</TableCell>
                            <TableCell className="text-right">{r.sales_returned_qty ? <Badge variant="secondary">{r.sales_returned_qty.toLocaleString()}</Badge> : '—'}</TableCell>
                            <TableCell className="text-right font-semibold">{r.net_qty.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(r.dispatched_value, { compact: false })}</TableCell>
                            <TableCell className="text-right">{r.credited_value ? formatCurrency(r.credited_value, { compact: false }) : '—'}</TableCell>
                            <TableCell>{r.last_dispatch_date ? format(new Date(r.last_dispatch_date), 'dd MMM yy') : '—'}</TableCell>
                            <TableCell>{r.last_return_date ? format(new Date(r.last_return_date), 'dd MMM yy') : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="money" className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Invoiced</div><div className="text-2xl font-semibold">{formatCurrency(moneyTotals.invoiced, { compact: false })}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Credit notes</div><div className="text-2xl font-semibold">{formatCurrency(moneyTotals.credited, { compact: false })}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Receipts</div><div className="text-2xl font-semibold">{formatCurrency(moneyTotals.received, { compact: false })}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Balance {balance >= 0 ? 'receivable' : '(customer in credit)'}</div><div className={`text-2xl font-semibold ${balance >= 0 ? 'text-primary' : 'text-green-600'}`}>{formatCurrency(Math.abs(balance), { compact: false })}</div></CardContent></Card>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingStmt ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                        ) : stmtErr ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-6 text-destructive">{(stmtErr as Error).message}</TableCell></TableRow>
                        ) : statement.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No issued invoices, credit notes or receipts in the range.</TableCell></TableRow>
                        ) : statement.map((r) => (
                          <TableRow key={`${r.doc_type}-${r.doc_id}`} className={r.doc_type !== 'receipt' ? 'cursor-pointer hover:bg-muted/40' : ''} onClick={() => openDoc(r)}>
                            <TableCell>{format(new Date(r.entry_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell><Badge variant={r.doc_type === 'invoice' ? 'outline' : r.doc_type === 'credit_note' ? 'secondary' : 'default'}>{docLabel[r.doc_type] || r.doc_type}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{r.doc_number}</TableCell>
                            <TableCell className="text-sm">{r.description}</TableCell>
                            <TableCell className="text-right">{r.debit ? formatCurrency(r.debit, { compact: false, decimals: 2 }) : ''}</TableCell>
                            <TableCell className="text-right">{r.credit ? formatCurrency(r.credit, { compact: false, decimals: 2 }) : ''}</TableCell>
                            <TableCell className={`text-right font-medium ${r.balance < 0 ? 'text-green-600' : ''}`}>{formatCurrency(r.balance, { compact: false, decimals: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <SalesReturnDialog open={createOpen} onOpenChange={setCreateOpen} defaultClientId={clientId} onSaved={(id) => navigate(`/sales/returns/${id}`)} />
    </MainLayout>
  );
}
