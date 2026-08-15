import { useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, CheckCircle2, Send, XCircle } from 'lucide-react';

import { format } from 'date-fns';
import {
  useQuotations,
  useUpdateQuotationStatus,
  useDeleteQuotation,
  type Quotation,
  type QuotationStatus,
} from '@/hooks/useSales';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { QuotationDialog } from '@/components/sales/QuotationDialog';
import { AcceptQuotationDialog } from '@/components/sales/AcceptQuotationDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUS_COLORS: Record<QuotationStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
};

export default function Quotations() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [status, setStatus] = usePersistedState('quotations.status', 'all');
  const [clientId, setClientId] = usePersistedState('quotations.client', 'all');
  const [startDate, setStartDate] = usePersistedState('quotations.startDate', () =>
    format(new Date(Date.now() - 90 * 86400_000), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = usePersistedState('quotations.endDate', () =>
    format(new Date(), 'yyyy-MM-dd'),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptTarget, setAcceptTarget] = useState<Quotation | null>(null);

  const { data: clients = [] } = useClients();
  const { data: quotes = [], isLoading } = useQuotations({ status, clientId, startDate, endDate });
  const updateStatus = useUpdateQuotationStatus();
  const del = useDeleteQuotation();

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (q: Quotation) => { setEditing(q); setDialogOpen(true); };
  const openAccept = (q: Quotation) => { setAcceptTarget(q); setAcceptOpen(true); };

  return (
    <MainLayout title="Quotations" subtitle="Create and track customer price quotes">
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
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            {/* Price Calculator reconnects in Phase 6 */}
            <Button onClick={openNew}><Plus size={16} className="mr-2" /> New Quotation</Button>
          </div>

        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-56">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : quotes.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No quotations found</TableCell></TableRow>
                  ) : quotes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-sm">{q.quote_number}</TableCell>
                      <TableCell>{format(new Date(q.quote_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{q.clients?.name}</TableCell>
                      <TableCell className="text-right">{q.quotation_items?.length || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(q.subtotal), { compact: false })}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(q.total_amount), { compact: false })}</TableCell>
                      <TableCell>{q.valid_until ? format(new Date(q.valid_until), 'dd MMM') : '—'}</TableCell>
                      <TableCell><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[q.status]}`}>{q.status}</span></TableCell>
                      <TableCell className="text-right">
                        {q.status === 'draft' && (
                          <>
                            <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(q)}><Pencil size={14} /></Button>
                            <Button size="icon" variant="ghost" title="Mark as Sent" onClick={() => updateStatus.mutate({ id: q.id, status: 'sent' })}><Send size={14} /></Button>
                          </>
                        )}
                        {q.status === 'sent' && (
                          <>
                            <Button size="icon" variant="ghost" title="Accept & Create SO" onClick={() => openAccept(q)}><CheckCircle2 size={14} className="text-green-600" /></Button>
                            <Button size="icon" variant="ghost" title="Reject" onClick={() => updateStatus.mutate({ id: q.id, status: 'rejected' })}><XCircle size={14} className="text-red-600" /></Button>
                          </>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost"><Trash2 size={14} /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {q.quote_number}?</AlertDialogTitle>
                                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del.mutate(q.id)}>Delete</AlertDialogAction>
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

      <QuotationDialog open={dialogOpen} onOpenChange={setDialogOpen} quotation={editing} />
      <AcceptQuotationDialog
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        quotationId={acceptTarget?.id || null}
        quoteNumber={acceptTarget?.quote_number}
      />
    </MainLayout>
  );
}
