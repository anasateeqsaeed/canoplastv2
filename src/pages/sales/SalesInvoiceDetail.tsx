import { useRef, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Printer, Save, Pencil, X, Plus, Trash2, Lock } from 'lucide-react';
import { useSalesInvoice, useUpdateInvoice, useSaveInvoiceCorrections, type CorrectionLineInput } from '@/hooks/useSalesInvoices';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';

type LineRow = {
  key: string;
  dispatch_item_id: string | null;
  dc: string;
  date: string | null;
  product: string;
  code: string;
  qty: number;
  rate: number;
  sort_order: number;
  isManual: boolean;
  hasOverride: boolean;
};

export default function SalesInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useSalesInvoice(id);
  const update = useUpdateInvoice();
  const saveCorrections = useSaveInvoiceCorrections();
  const { hasAnyRole } = useAuth();
  const isAdmin = hasAnyRole(['admin']);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const [editMode, setEditMode] = useState(false);

  // Header form
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToGst, setBillToGst] = useState('');
  const [taxPercent, setTaxPercent] = useState(0);
  const [freight, setFreight] = useState(0);
  const [other, setOther] = useState(0);
  const [status, setStatus] = useState<'draft' | 'issued' | 'cancelled'>('draft');
  const [notes, setNotes] = useState('');

  // Editable lines
  const [lines, setLines] = useState<LineRow[]>([]);

  // Build merged lines (dispatch + overrides + manual)
  const buildLines = (inv: any): LineRow[] => {
    const corrections: any[] = inv.sales_invoice_corrections || [];
    const corrByItem = new Map<string, any>();
    const manuals: any[] = [];
    corrections.forEach((c) => {
      if (c.dispatch_item_id) corrByItem.set(c.dispatch_item_id, c);
      else manuals.push(c);
    });

    const rows: LineRow[] = [];
    (inv.sales_invoice_dispatches || []).forEach((sid: any) => {
      const d = sid.dispatches;
      (d?.dispatch_items || []).forEach((it: any) => {
        const c = corrByItem.get(it.id);
        const baseQty = Number(it.total_qty || 0);
        const baseRate = Number(it.agreed_selling_price || 0);
        rows.push({
          key: it.id,
          dispatch_item_id: it.id,
          dc: d.dispatch_number,
          date: d.dispatch_date,
          product: c?.line_label || it.products?.name || '',
          code: it.products?.code || '',
          qty: c?.qty != null ? Number(c.qty) : baseQty,
          rate: c?.rate != null ? Number(c.rate) : baseRate,
          sort_order: 0,
          isManual: false,
          hasOverride: !!c,
        });
      });
    });
    manuals
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .forEach((m, idx) => {
        rows.push({
          key: m.id,
          dispatch_item_id: null,
          dc: '',
          date: null,
          product: m.line_label || '',
          code: '',
          qty: Number(m.qty || 0),
          rate: Number(m.rate || 0),
          sort_order: m.sort_order ?? idx + 1,
          isManual: true,
          hasOverride: true,
        });
      });
    return rows;
  };

  useEffect(() => {
    if (!invoice) return;
    setInvNumber(invoice.invoice_number_override || invoice.invoice_number || '');
    setInvDate(invoice.invoice_date || '');
    setPeriodFrom(invoice.period_from || '');
    setPeriodTo(invoice.period_to || '');
    setBillToName(invoice.bill_to_name || invoice.clients?.name || '');
    setBillToAddress(invoice.bill_to_address || invoice.clients?.address || '');
    setBillToGst(invoice.bill_to_gst || invoice.clients?.gst_number || '');
    setTaxPercent(Number(invoice.tax_percent || 0));
    setFreight(Number(invoice.freight_charges || 0));
    setOther(Number(invoice.other_charges || 0));
    setStatus(invoice.status);
    setNotes(invoice.notes || '');
    setLines(buildLines(invoice));
  }, [invoice]);

  const canEdit = useMemo(() => {
    if (!invoice) return false;
    if (invoice.status === 'cancelled') return false;
    if (invoice.status === 'issued') return isAdmin;
    return true; // draft
  }, [invoice, isAdmin]);

  const hasAnyOverride = useMemo(() => {
    if (!invoice) return false;
    return (
      (invoice.sales_invoice_corrections?.length || 0) > 0 ||
      invoice.invoice_number_override ||
      invoice.bill_to_name ||
      invoice.bill_to_address ||
      invoice.bill_to_gst
    );
  }, [invoice]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
    const tax = Math.round(subtotal * (Number(taxPercent) || 0)) / 100;
    const grand = subtotal + tax + (Number(freight) || 0) + (Number(other) || 0);
    return { subtotal, tax, grand };
  }, [lines, taxPercent, freight, other]);

  if (isLoading || !invoice) {
    return <MainLayout title="Invoice"><div className="p-6">Loading…</div></MainLayout>;
  }

  const updateLine = (key: string, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };
  const addManualLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        dispatch_item_id: null,
        dc: '',
        date: null,
        product: '',
        code: '',
        qty: 0,
        rate: 0,
        sort_order: prev.length + 1,
        isManual: true,
        hasOverride: true,
      },
    ]);
  };
  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const onCancelEdit = () => {
    setLines(buildLines(invoice));
    setInvNumber(invoice.invoice_number_override || invoice.invoice_number || '');
    setInvDate(invoice.invoice_date || '');
    setPeriodFrom(invoice.period_from || '');
    setPeriodTo(invoice.period_to || '');
    setBillToName(invoice.bill_to_name || invoice.clients?.name || '');
    setBillToAddress(invoice.bill_to_address || invoice.clients?.address || '');
    setBillToGst(invoice.bill_to_gst || invoice.clients?.gst_number || '');
    setTaxPercent(Number(invoice.tax_percent || 0));
    setFreight(Number(invoice.freight_charges || 0));
    setOther(Number(invoice.other_charges || 0));
    setNotes(invoice.notes || '');
    setEditMode(false);
  };

  const onSaveCorrections = async () => {
    // Build correction payload: include overrides for dispatch lines that differ, and all manual lines
    const payload: CorrectionLineInput[] = [];
    (invoice.sales_invoice_dispatches || []).forEach((sid: any) => {
      (sid.dispatches?.dispatch_items || []).forEach((it: any) => {
        const row = lines.find((l) => l.dispatch_item_id === it.id);
        if (!row) return;
        const baseQty = Number(it.total_qty || 0);
        const baseRate = Number(it.agreed_selling_price || 0);
        const baseLabel = it.products?.name || '';
        const qtyChanged = Number(row.qty) !== baseQty;
        const rateChanged = Number(row.rate) !== baseRate;
        const labelChanged = (row.product || '') !== baseLabel;
        if (qtyChanged || rateChanged || labelChanged) {
          payload.push({
            dispatch_item_id: it.id,
            line_label: labelChanged ? row.product : null,
            qty: qtyChanged ? Number(row.qty) : null,
            rate: rateChanged ? Number(row.rate) : null,
            sort_order: 0,
          });
        }
      });
    });
    lines
      .filter((l) => l.isManual)
      .forEach((l, idx) =>
        payload.push({
          dispatch_item_id: null,
          line_label: l.product,
          qty: Number(l.qty) || 0,
          rate: Number(l.rate) || 0,
          sort_order: idx + 1,
        })
      );

    await saveCorrections.mutateAsync({
      invoiceId: invoice.id,
      header: {
        invoice_number_override: invNumber !== invoice.invoice_number ? invNumber : '',
        invoice_date: invDate,
        period_from: periodFrom || '',
        period_to: periodTo || '',
        bill_to_name: billToName !== (invoice.clients?.name || '') ? billToName : '',
        bill_to_address: billToAddress !== (invoice.clients?.address || '') ? billToAddress : '',
        bill_to_gst: billToGst !== (invoice.clients?.gst_number || '') ? billToGst : '',
        tax_percent: taxPercent,
        freight_charges: freight,
        other_charges: other,
        notes,
      },
      lines: payload,
    });
    setEditMode(false);
  };

  const displayNumber = invNumber || invoice.invoice_number;

  return (
    <MainLayout title={`Invoice ${displayNumber}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/sales/invoices')}><ArrowLeft size={14} className="mr-1" /> Back</Button>
          {!editMode && (
            <>
              <Button size="sm" onClick={handlePrint}><Printer size={14} className="mr-1" /> Print</Button>
              {canEdit ? (
                <Button size="sm" variant="secondary" onClick={() => setEditMode(true)}>
                  <Pencil size={14} className="mr-1" /> Edit Corrections
                </Button>
              ) : (
                <Badge variant="outline" className="gap-1"><Lock size={12} /> {invoice.status === 'issued' ? 'Issued — admin only' : 'Locked'}</Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => update.mutate({ id: invoice.id, patch: { status } as any })}
                disabled={update.isPending || status === invoice.status}
              >
                <Save size={14} className="mr-1" /> Save status
              </Button>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {editMode && (
            <>
              <Button size="sm" onClick={onSaveCorrections} disabled={saveCorrections.isPending}>
                <Save size={14} className="mr-1" /> Save corrections
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X size={14} className="mr-1" /> Discard
              </Button>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {hasAnyOverride && <Badge variant="destructive">Corrected</Badge>}
            <Badge variant={status === 'issued' ? 'default' : status === 'cancelled' ? 'destructive' : 'secondary'}>{status}</Badge>
          </div>
        </div>

        <Card>
          <CardContent className="p-6" ref={printRef}>
            <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">SALES INVOICE</h1>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-2 mt-2 max-w-md">
                    <div>
                      <Label className="text-xs">Invoice #</Label>
                      <Input value={invNumber} onChange={(e) => setInvNumber(e.target.value)} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Period From</Label>
                      <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Period To</Label>
                      <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="h-8" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground mt-1">Invoice # <span className="font-mono">{displayNumber}</span></div>
                    <div className="text-sm">Date: {format(new Date(invDate || invoice.invoice_date), 'dd MMM yyyy')}</div>
                    {periodFrom && periodTo && (
                      <div className="text-sm">Period: {format(new Date(periodFrom), 'dd MMM')} – {format(new Date(periodTo), 'dd MMM yyyy')}</div>
                    )}
                  </>
                )}
              </div>
              <div className="text-right space-y-1">
                <div className="font-semibold">Bill To</div>
                {editMode ? (
                  <div className="space-y-1 w-72 text-left">
                    <Input value={billToName} onChange={(e) => setBillToName(e.target.value)} placeholder="Name" className="h-8" />
                    <Textarea value={billToAddress} onChange={(e) => setBillToAddress(e.target.value)} placeholder="Address" rows={3} />
                    <Input value={billToGst} onChange={(e) => setBillToGst(e.target.value)} placeholder="GST #" className="h-8" />
                  </div>
                ) : (
                  <>
                    <div>{billToName}</div>
                    <div className="text-sm whitespace-pre-line">{billToAddress}</div>
                    {billToGst && <div className="text-sm">GST: {billToGst}</div>}
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>DC #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    {editMode && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.key} className={l.hasOverride ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                      <TableCell className="font-mono text-xs">{l.dc || (l.isManual ? '—' : '')}</TableCell>
                      <TableCell className="text-sm">{l.date ? format(new Date(l.date), 'dd MMM') : '—'}</TableCell>
                      <TableCell>
                        {editMode ? (
                          <Input value={l.product} onChange={(e) => updateLine(l.key, { product: e.target.value })} className="h-8" />
                        ) : (
                          <>
                            <div className="font-medium">{l.product}</div>
                            {l.code && <div className="text-xs text-muted-foreground font-mono">{l.code}</div>}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editMode ? (
                          <Input type="number" value={l.qty} onChange={(e) => updateLine(l.key, { qty: Number(e.target.value) })} className="h-8 w-24 ml-auto text-right" />
                        ) : (
                          l.qty
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editMode ? (
                          <Input type="number" step="0.01" value={l.rate} onChange={(e) => updateLine(l.key, { rate: Number(e.target.value) })} className="h-8 w-28 ml-auto text-right" />
                        ) : (
                          formatCurrency(l.rate, { compact: false, decimals: 2 })
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency((Number(l.qty) || 0) * (Number(l.rate) || 0), { compact: false, decimals: 2 })}
                      </TableCell>
                      {editMode && (
                        <TableCell>
                          {l.isManual && (
                            <Button size="icon" variant="ghost" onClick={() => removeLine(l.key)}>
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {editMode && (
                <Button size="sm" variant="outline" className="mt-2" onClick={addManualLine}>
                  <Plus size={14} className="mr-1" /> Add manual line
                </Button>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal, { compact: false, decimals: 2 })}</span></div>
                <div className="flex justify-between items-center">
                  <span>Tax %</span>
                  {editMode ? (
                    <Input type="number" step="0.01" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} className="h-7 w-24 text-right" />
                  ) : (
                    <span>{taxPercent}%</span>
                  )}
                </div>
                <div className="flex justify-between"><span>Tax Amount</span><span>{formatCurrency(totals.tax, { compact: false, decimals: 2 })}</span></div>
                <div className="flex justify-between items-center">
                  <span>Freight</span>
                  {editMode ? (
                    <Input type="number" step="0.01" value={freight} onChange={(e) => setFreight(Number(e.target.value))} className="h-7 w-28 text-right" />
                  ) : (
                    <span>{formatCurrency(freight, { compact: false, decimals: 2 })}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span>Other</span>
                  {editMode ? (
                    <Input type="number" step="0.01" value={other} onChange={(e) => setOther(Number(e.target.value))} className="h-7 w-28 text-right" />
                  ) : (
                    <span>{formatCurrency(other, { compact: false, decimals: 2 })}</span>
                  )}
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold text-base"><span>Grand Total</span><span>{formatCurrency(totals.grand, { compact: false, decimals: 2 })}</span></div>
              </div>
            </div>

            <div className="mt-6 text-sm">
              <span className="font-medium">Notes:</span>{' '}
              {editMode ? (
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
              ) : (
                notes || <span className="text-muted-foreground">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
