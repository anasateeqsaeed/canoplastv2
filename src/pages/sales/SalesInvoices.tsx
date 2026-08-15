import { useState, useMemo } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Trash2, Printer } from 'lucide-react';
import { useSalesInvoices, useDeleteInvoice } from '@/hooks/useSalesInvoices';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { GenerateInvoiceDialog } from '@/components/sales/GenerateInvoiceDialog';

export default function SalesInvoicesPage() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [status, setStatus] = usePersistedState('sales-invoices.status', 'all');
  const [clientId, setClientId] = usePersistedState<string>('sales-invoices.client', 'all');
  const [startDate, setStartDate] = usePersistedState('sales-invoices.startDate', () =>
    format(new Date(Date.now() - 30 * 86400_000), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = usePersistedState('sales-invoices.endDate', () =>
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [generateOpen, setGenerateOpen] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: invoices = [], isLoading } = useSalesInvoices({
    status,
    clientId: clientId === 'all' ? undefined : clientId,
    startDate,
    endDate,
  });
  const del = useDeleteInvoice();

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, i) => ({
        count: acc.count + 1,
        subtotal: acc.subtotal + Number(i.subtotal || 0),
        tax: acc.tax + Number(i.tax_amount || 0),
        total: acc.total + Number(i.total_amount || 0),
      }),
      { count: 0, subtotal: 0, tax: 0, total: 0 },
    );
  }, [invoices]);

  return (
    <MainLayout title="Sales Invoices" subtitle="Invoices generated from dispatches">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Customer</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus size={16} className="mr-2" /> Generate Consolidated Invoice
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Invoices</div><div className="text-2xl font-semibold">{totals.count}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Subtotal</div><div className="text-2xl font-semibold">{formatCurrency(totals.subtotal, { compact: false })}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tax</div><div className="text-2xl font-semibold">{formatCurrency(totals.tax, { compact: false })}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Grand Total</div><div className="text-2xl font-semibold text-primary">{formatCurrency(totals.total, { compact: false })}</div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Dispatches</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No invoices found</TableCell></TableRow>
                  ) : invoices.map((inv) => (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/sales/invoices/${inv.id}`)}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{inv.clients?.name}</TableCell>
                      <TableCell><Badge variant="outline">{inv.invoice_type}</Badge></TableCell>
                      <TableCell className="text-right">{inv.sales_invoice_dispatches?.length || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(inv.subtotal), { compact: false })}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(inv.tax_amount), { compact: false })}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(inv.total_amount), { compact: false })}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'issued' ? 'default' : inv.status === 'cancelled' ? 'destructive' : 'secondary'}>{inv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/sales/invoices/${inv.id}`)}><Eye size={14} /></Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost"><Trash2 size={14} /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete invoice {inv.invoice_number}?</AlertDialogTitle>
                                <AlertDialogDescription>Linked dispatches will become unbilled again.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del.mutate(inv.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <GenerateInvoiceDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </MainLayout>
  );
}
