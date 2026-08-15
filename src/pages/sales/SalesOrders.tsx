import { useNavigate } from 'react-router-dom';
import { usePersistedState } from '@/hooks/usePersistedState';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  useSalesOrders,
  useDeleteSalesOrder,
  type SalesOrderStatus,
} from '@/hooks/useSales';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_COLORS: Record<SalesOrderStatus, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  in_production: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  fulfilled: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  closed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
};

function pct(num: number, denom: number) {
  if (!denom) return 0;
  return Math.min(100, Math.round((num / denom) * 100));
}

export default function SalesOrders() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [status, setStatus] = usePersistedState('sales-orders.status', 'all');
  const [clientId, setClientId] = usePersistedState('sales-orders.client', 'all');
  const [startDate, setStartDate] = usePersistedState('sales-orders.startDate', () =>
    format(new Date(Date.now() - 90 * 86400_000), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = usePersistedState('sales-orders.endDate', () =>
    format(new Date(), 'yyyy-MM-dd'),
  );

  const { data: clients = [] } = useClients();
  const { data: orders = [], isLoading } = useSalesOrders({ status, clientId, startDate, endDate });
  const del = useDeleteSalesOrder();

  return (
    <MainLayout title="Sales Orders" subtitle="Confirmed customer orders driving production">
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            Sales orders are created from accepted quotations.
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>SO #</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Customer PO</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-40">Produced</TableHead>
                    <TableHead className="w-40">Dispatched</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No sales orders</TableCell></TableRow>
                  ) : orders.map((so) => {
                    const totalOrd = (so.sales_order_items || []).reduce((s, it) => s + Number(it.ordered_qty || 0), 0);
                    const totalProd = (so.sales_order_items || []).reduce((s, it) => s + Number(it.produced_qty || 0), 0);
                    const totalDisp = (so.sales_order_items || []).reduce((s, it) => s + Number(it.dispatched_qty || 0), 0);
                    return (
                      <TableRow key={so.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/sales/orders/${so.id}`)}>
                        <TableCell className="font-mono text-sm">{so.so_number}</TableCell>
                        <TableCell>{format(new Date(so.order_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{so.clients?.name}</TableCell>
                        <TableCell className="text-xs">{so.customer_po_number || '—'}</TableCell>
                        <TableCell>{so.required_date ? format(new Date(so.required_date), 'dd MMM') : '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(so.total_amount), { compact: false })}</TableCell>
                        <TableCell>
                          <div className="text-xs">{Math.round(totalProd).toLocaleString()} / {Math.round(totalOrd).toLocaleString()} ({pct(totalProd, totalOrd)}%)</div>
                          <div className="h-1.5 bg-muted rounded mt-1">
                            <div className="h-1.5 bg-amber-500 rounded" style={{ width: `${pct(totalProd, totalOrd)}%` }} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">{Math.round(totalDisp).toLocaleString()} / {Math.round(totalOrd).toLocaleString()} ({pct(totalDisp, totalOrd)}%)</div>
                          <div className="h-1.5 bg-muted rounded mt-1">
                            <div className="h-1.5 bg-green-500 rounded" style={{ width: `${pct(totalDisp, totalOrd)}%` }} />
                          </div>
                        </TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${STATUS_COLORS[so.status]}`}>{so.status.replace('_', ' ')}</span></TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/sales/orders/${so.id}`)}><Eye size={14} /></Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost"><Trash2 size={14} /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {so.so_number}?</AlertDialogTitle>
                                  <AlertDialogDescription>Linked production jobs will lose the SO link but remain.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => del.mutate(so.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
    </MainLayout>
  );
}
