import { useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Printer, Pencil, Trash2, CheckCircle2, Ban, Landmark, Receipt, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import {
  useSalesReturn,
  usePostSalesReturn,
  useCancelSalesReturn,
  useDeleteSalesReturn,
  usePostSalesReturnToGl,
  RETURN_REASONS,
  DISPOSITIONS,
} from '@/hooks/useSalesReturns';
import { SalesReturnDialog } from '@/components/sales/SalesReturnDialog';
import { CreditNoteAllocationDialog } from '@/components/sales/CreditNoteAllocationDialog';

const statusVariant = (s: string): 'default' | 'destructive' | 'secondary' =>
  s === 'posted' ? 'default' : s === 'cancelled' ? 'destructive' : 'secondary';

export default function SalesReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const listPath = pathname.startsWith('/inventory') ? '/inventory/customer-returns' : '/sales/returns';
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(['admin', 'sales_manager', 'store_incharge']);
  const canCancel = hasAnyRole(['admin', 'sales_manager']);
  const canGl = hasAnyRole(['admin', 'accountant', 'finance_manager']);

  const { data: ret, isLoading } = useSalesReturn(id);
  const post = usePostSalesReturn();
  const cancel = useCancelSalesReturn();
  const del = useDeleteSalesReturn();
  const postGl = usePostSalesReturnToGl();

  const [editOpen, setEditOpen] = useState(false);
  const [allocOpen, setAllocOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  if (isLoading || !ret) {
    return <MainLayout title="Customer Return"><div className="p-6">Loading…</div></MainLayout>;
  }

  const items = ret.sales_return_items || [];
  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const totalWt = items.reduce((s, i) => s + Number(i.weight_kg || 0), 0);
  const allocated = (ret.sales_return_allocations || []).reduce((s, a) => s + Number(a.amount || 0), 0);
  const unapplied = Number(ret.total_amount) - allocated;
  const reasonLabel = RETURN_REASONS.find((r) => r.value === ret.reason)?.label || ret.reason;
  const dispLabel = (v: string) => DISPOSITIONS.find((d) => d.value === v)?.label || v;
  const isDraft = ret.status === 'draft';
  const isPosted = ret.status === 'posted';

  return (
    <MainLayout title={`Return ${ret.return_number}`} subtitle={ret.clients?.name}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate(listPath)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
          <Button size="sm" variant="secondary" onClick={handlePrint}><Printer size={14} className="mr-1" /> Print</Button>

          {isDraft && canManage && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}><Pencil size={14} className="mr-1" /> Edit</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={post.isPending || items.length === 0}><CheckCircle2 size={14} className="mr-1" /> Post (Gate-In + Credit Note)</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Post return {ret.return_number}?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-1 text-sm">
                        <p>This will, in one step:</p>
                        <ul className="list-disc pl-5">
                          <li>Create a gate-in entry for {totalQty.toLocaleString()} pieces from {ret.clients?.name}</li>
                          <li>Add the pieces back to FG stock (rework/scrap lines are booked in and rejected out)</li>
                          <li>Issue a credit note of {formatCurrency(Number(ret.total_amount), { compact: false, decimals: 2 })} on the customer's account</li>
                        </ul>
                        <p>Lines cannot be changed afterwards.</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Not yet</AlertDialogCancel>
                    <AlertDialogAction onClick={() => post.mutate(ret.id)}>Post</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive"><Trash2 size={14} className="mr-1" /> Delete draft</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete draft {ret.return_number}?</AlertDialogTitle>
                    <AlertDialogDescription>Nothing has been posted yet, so this just removes the draft.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(ret.id, { onSuccess: () => navigate(listPath) })}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {isPosted && (canManage || canGl) && (
            <Button size="sm" variant="secondary" onClick={() => setAllocOpen(true)}>
              <Receipt size={14} className="mr-1" /> Apply to invoices
            </Button>
          )}
          {isPosted && canGl && !ret.gl_voucher_id && (
            <Button size="sm" variant="outline" onClick={() => postGl.mutate(ret.id)} disabled={postGl.isPending || Number(ret.total_amount) <= 0}>
              <Landmark size={14} className="mr-1" /> Book to GL
            </Button>
          )}
          {isPosted && canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive"><Ban size={14} className="mr-1" /> Cancel return</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel posted return {ret.return_number}?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2 text-sm">
                      <p>Stock movements are reversed, the gate entry is marked cancelled, invoice allocations are removed{ret.gl_voucher_id ? ' and the GL voucher is reversed (accounting role required)' : ''}.</p>
                      <Input placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel.mutate({ id: ret.id, reason: cancelReason })}>Cancel return</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <div className="ml-auto flex items-center gap-2">
            {ret.gl_voucher_id && <Badge variant="outline" className="gap-1"><Landmark size={12} /> In GL</Badge>}
            {!isDraft && <Badge variant="outline" className="gap-1"><Lock size={12} /> Locked</Badge>}
            <Badge variant={statusVariant(ret.status)}>{ret.status}</Badge>
          </div>
        </div>

        {isPosted && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Credit note</div><div className="text-lg font-mono font-semibold">{ret.credit_note_number}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Gate-in #</div><div className="text-lg font-mono font-semibold">{ret.gate_pass_number || '—'}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Applied to invoices</div><div className="text-lg font-semibold">{formatCurrency(allocated, { compact: false, decimals: 2 })}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Open credit on account</div><div className="text-lg font-semibold text-primary">{formatCurrency(unapplied, { compact: false, decimals: 2 })}</div></CardContent></Card>
          </div>
        )}

        <Card>
          <CardContent className="p-6" ref={printRef}>
            <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">{isPosted ? 'CREDIT NOTE' : 'CUSTOMER RETURN'}</h1>
                {ret.credit_note_number && <div className="text-sm">Credit Note # <span className="font-mono font-semibold">{ret.credit_note_number}</span></div>}
                <div className="text-sm text-muted-foreground">Return # <span className="font-mono">{ret.return_number}</span></div>
                {ret.gate_pass_number && <div className="text-sm text-muted-foreground">Gate-In # <span className="font-mono">{ret.gate_pass_number}</span></div>}
                <div className="text-sm">Date: {format(new Date(ret.return_date), 'dd MMM yyyy')}</div>
                <div className="text-sm">Reason: {reasonLabel}{ret.reference ? ` · Ref: ${ret.reference}` : ''}</div>
              </div>
              <div className="text-right space-y-1">
                <div className="font-semibold">Customer</div>
                <div>{ret.clients?.name}</div>
                {ret.clients?.address && <div className="text-sm whitespace-pre-line">{ret.clients.address}</div>}
                {ret.clients?.gst_number && <div className="text-sm">GST: {ret.clients.gst_number}</div>}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm mb-4">
              <div><span className="text-muted-foreground">Returned by:</span> {ret.returned_by || '—'}</div>
              <div><span className="text-muted-foreground">Received by:</span> {ret.received_by || '—'}</div>
              <div><span className="text-muted-foreground">Vehicle:</span> {ret.vehicle_number || '—'}</div>
              <div><span className="text-muted-foreground">Driver:</span> {ret.driver_name || '—'}</div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty (pcs)</TableHead>
                    <TableHead className="text-right">Weight kg</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No lines yet — edit the draft to add products.</TableCell></TableRow>
                  ) : items.map((it, idx) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{it.products?.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{it.products?.code}</div>
                      </TableCell>
                      <TableCell className="text-right">{Number(it.quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{it.weight_kg != null ? Number(it.weight_kg).toFixed(3) : '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(it.rate), { compact: false, decimals: 2 })}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(it.line_total), { compact: false, decimals: 2 })}</TableCell>
                      <TableCell><Badge variant={it.disposition === 'restock' ? 'outline' : 'secondary'}>{dispLabel(it.disposition)}</Badge></TableCell>
                      <TableCell className="text-sm">{it.remarks || ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex justify-between flex-wrap gap-4">
              <div className="text-sm space-y-1">
                <div>Total pieces: <span className="font-semibold">{totalQty.toLocaleString()}</span></div>
                {totalWt > 0 && <div>Total weight: <span className="font-semibold">{totalWt.toFixed(3)} kg</span></div>}
                {ret.notes && <div className="mt-2"><span className="font-medium">Notes:</span> {ret.notes}</div>}
              </div>
              <div className="w-80 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(ret.subtotal), { compact: false, decimals: 2 })}</span></div>
                <div className="flex justify-between"><span>Tax {Number(ret.tax_percent)}%</span><span>{formatCurrency(Number(ret.tax_amount), { compact: false, decimals: 2 })}</span></div>
                <div className="flex justify-between border-t pt-1 font-semibold text-base"><span>Credit note value</span><span>{formatCurrency(Number(ret.total_amount), { compact: false, decimals: 2 })}</span></div>
              </div>
            </div>

            {isPosted && (ret.sales_return_allocations || []).length > 0 && (
              <div className="mt-6 text-sm">
                <div className="font-medium mb-1">Applied against invoices</div>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Invoice total</TableHead><TableHead className="text-right">Credit applied</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ret.sales_return_allocations || []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.sales_invoices?.invoice_number_override || a.sales_invoices?.invoice_number}</TableCell>
                        <TableCell>{a.sales_invoices?.invoice_date ? format(new Date(a.sales_invoices.invoice_date), 'dd MMM yyyy') : ''}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(a.sales_invoices?.total_amount || 0), { compact: false, decimals: 2 })}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(a.amount), { compact: false, decimals: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {ret.status === 'cancelled' && (
              <div className="mt-4 text-sm text-destructive">
                Cancelled {ret.cancelled_at ? format(new Date(ret.cancelled_at), 'dd MMM yyyy HH:mm') : ''}{ret.cancel_reason ? ` — ${ret.cancel_reason}` : ''}
              </div>
            )}

            <div className="mt-10 grid grid-cols-3 gap-8 text-xs text-muted-foreground print:mt-16">
              <div className="border-t pt-1">Received by (Store / Gate)</div>
              <div className="border-t pt-1">Checked by (Sales)</div>
              <div className="border-t pt-1">Customer signature</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SalesReturnDialog open={editOpen} onOpenChange={setEditOpen} existing={ret} />
      {isPosted && <CreditNoteAllocationDialog open={allocOpen} onOpenChange={setAllocOpen} salesReturn={ret} />}
    </MainLayout>
  );
}
