import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Eye, Undo2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { useSalesReturns, RETURN_REASONS } from '@/hooks/useSalesReturns';
import { SalesReturnDialog } from '@/components/sales/SalesReturnDialog';

const statusVariant = (s: string): 'default' | 'destructive' | 'secondary' =>
  s === 'posted' ? 'default' : s === 'cancelled' ? 'destructive' : 'secondary';

export default function SalesReturnsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Same screen is mounted under /sales and /inventory so store users reach it
  // through their own module; keep detail links inside the module we came from.
  const base = pathname.startsWith('/inventory') ? '/inventory/customer-returns' : '/sales/returns';
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['admin', 'sales_manager', 'store_incharge']);
  const [status, setStatus] = useState('all');
  const [clientId, setClientId] = useState('all');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 90 * 86400_000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [createOpen, setCreateOpen] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: returns = [], isLoading } = useSalesReturns({
    status,
    clientId: clientId === 'all' ? undefined : clientId,
    startDate,
    endDate,
  });

  const totals = useMemo(() => {
    return returns.reduce(
      (acc, r) => {
        const qty = (r.sales_return_items || []).reduce((s, i) => s + Number(i.quantity || 0), 0);
        acc.count += 1;
        acc.qty += qty;
        if (r.status === 'posted') acc.credit += Number(r.total_amount || 0);
        if (r.status === 'draft') acc.drafts += 1;
        return acc;
      },
      { count: 0, qty: 0, credit: 0, drafts: 0 },
    );
  }, [returns]);

  const reasonLabel = (v: string) => RETURN_REASONS.find((r) => r.value === v)?.label || v;

  return (
    <MainLayout title="Customer Returns & Credit Notes" subtitle="Goods returned by customers — gate-in, FG stock restore and credit against the customer account">
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
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => navigate('/sales/customer-ledger')}>
              <BookOpen size={16} className="mr-2" /> Customer Ledger
            </Button>
            {canManage && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={16} className="mr-2" /> New Return
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Returns</div><div className="text-2xl font-semibold">{totals.count}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pieces returned</div><div className="text-2xl font-semibold">{totals.qty.toLocaleString()}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Credit issued (posted)</div><div className="text-2xl font-semibold text-primary">{formatCurrency(totals.credit, { compact: false })}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Drafts awaiting posting</div><div className="text-2xl font-semibold">{totals.drafts}</div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Credit Note #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead className="text-right">Credit value</TableHead>
                    <TableHead>Gate pass</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : returns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                        <Undo2 className="mx-auto mb-2 opacity-40" />
                        No customer returns in this range.
                      </TableCell>
                    </TableRow>
                  ) : returns.map((r) => {
                    const qty = (r.sales_return_items || []).reduce((s, i) => s + Number(i.quantity || 0), 0);
                    return (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`${base}/${r.id}`)}>
                        <TableCell className="font-mono text-sm">{r.return_number}</TableCell>
                        <TableCell className="font-mono text-sm">{r.credit_note_number || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{format(new Date(r.return_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-medium">{r.clients?.name}</TableCell>
                        <TableCell><Badge variant="outline">{reasonLabel(r.reason)}</Badge></TableCell>
                        <TableCell className="text-right">{r.sales_return_items?.length || 0}</TableCell>
                        <TableCell className="text-right">{qty.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(r.total_amount), { compact: false, decimals: 2 })}</TableCell>
                        <TableCell className="font-mono text-xs">{r.gate_pass_number || '—'}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => navigate(`${base}/${r.id}`)}><Eye size={14} /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <SalesReturnDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(id) => navigate(`${base}/${id}`)} />
    </MainLayout>
  );
}
