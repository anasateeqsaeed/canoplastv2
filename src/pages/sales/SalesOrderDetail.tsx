import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Send, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useSalesOrder, useUpdateSalesOrderStatus } from '@/hooks/useSales';
import { formatCurrency } from '@/lib/currency';

// ReleaseToProductionDialog + linked production_jobs reconnect in Phase 5

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.min(100, Math.round((n / d) * 100));
}

export default function SalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: so, isLoading } = useSalesOrder(id);
  const updateStatus = useUpdateSalesOrderStatus();

  if (isLoading || !so) {
    return <MainLayout title="Sales Order"><div className="p-8 text-center text-muted-foreground">Loading…</div></MainLayout>;
  }

  return (
    <MainLayout title={`Sales Order ${so.so_number}`} subtitle={so.clients?.name}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => navigate('/sales/orders')}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
          <div className="ml-auto flex gap-2">
            {so.status === 'open' || so.status === 'in_production' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled>
                        <Send size={14} className="mr-1" /> Release to Production
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Production module lands in Phase 5</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {so.status === 'fulfilled' && (
              <Button variant="outline" onClick={() => updateStatus.mutate({ id: so.id, status: 'closed' })}>
                <CheckCircle2 size={14} className="mr-1" /> Close Order
              </Button>
            )}
            {so.status !== 'closed' && so.status !== 'cancelled' && (
              <Button variant="ghost" onClick={() => updateStatus.mutate({ id: so.id, status: 'cancelled' })}>
                <XCircle size={14} className="mr-1" /> Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Order Date</div><div className="text-lg font-semibold">{format(new Date(so.order_date), 'dd MMM yyyy')}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Required Date</div><div className="text-lg font-semibold">{so.required_date ? format(new Date(so.required_date), 'dd MMM yyyy') : '—'}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Customer PO</div><div className="text-lg font-semibold">{so.customer_po_number || '—'}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-lg font-semibold text-primary">{formatCurrency(Number(so.total_amount), { compact: false })}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Order Lines</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Dispatched</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="text-right">Labour</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(so.sales_order_items || []).map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="font-medium">{it.products?.code}</div>
                        <div className="text-xs text-muted-foreground">{it.products?.name}</div>
                      </TableCell>
                      <TableCell className="text-right">{Number(it.ordered_qty).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div>{Number(it.produced_qty || 0).toLocaleString()} ({pct(it.produced_qty, it.ordered_qty)}%)</div>
                        <div className="h-1.5 bg-muted rounded mt-1"><div className="h-1.5 bg-amber-500 rounded" style={{ width: `${pct(it.produced_qty, it.ordered_qty)}%` }} /></div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{Number(it.dispatched_qty || 0).toLocaleString()} ({pct(it.dispatched_qty, it.ordered_qty)}%)</div>
                        <div className="h-1.5 bg-muted rounded mt-1"><div className="h-1.5 bg-green-500 rounded" style={{ width: `${pct(it.dispatched_qty, it.ordered_qty)}%` }} /></div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(it.selling_price), { compact: false })}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(it.labour_price), { compact: false })}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(it.line_total), { compact: false })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Linked Production Jobs card reconnects in Phase 5 (production_jobs) */}

        {so.notes && (
          <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm">{so.notes}</CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
