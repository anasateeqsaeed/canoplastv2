import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { ProductSelector } from '@/components/selectors/ProductSelector';
import { useClients } from '@/hooks/useClients';
import { formatCurrency } from '@/lib/currency';
import {
  RETURN_REASONS,
  DISPOSITIONS,
  fetchReturnRate,
  useCreateSalesReturn,
  useUpdateSalesReturn,
  type SalesReturn,
  type SalesReturnHeaderInput,
  type SalesReturnLineInput,
  type SalesReturnReason,
  type ReturnDisposition,
} from '@/hooks/useSalesReturns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When set, the dialog edits this draft instead of creating a new one. */
  existing?: SalesReturn | null;
  /** Pre-select a customer (e.g. from the customer ledger page). */
  defaultClientId?: string;
  onSaved?: (id: string) => void;
}

interface LineState extends SalesReturnLineInput {
  key: string;
  rate_source?: string;
}

const newLine = (): LineState => ({
  key: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  product_id: '',
  quantity: 0,
  weight_kg: null,
  rate: 0,
  disposition: 'restock',
  remarks: '',
});

export function SalesReturnDialog({ open, onOpenChange, existing, defaultClientId, onSaved }: Props) {
  const { data: clients = [] } = useClients();
  const create = useCreateSalesReturn();
  const update = useUpdateSalesReturn();

  const [clientId, setClientId] = useState('');
  const [returnDate, setReturnDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = useState<SalesReturnReason>('rejection');
  const [reference, setReference] = useState('');
  const [returnedBy, setReturnedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineState[]>([newLine()]);

  // (Re)load form whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setClientId(existing.client_id);
      setReturnDate(existing.return_date);
      setReason(existing.reason);
      setReference(existing.reference || '');
      setReturnedBy(existing.returned_by || '');
      setReceivedBy(existing.received_by || '');
      setVehicle(existing.vehicle_number || '');
      setDriver(existing.driver_name || '');
      setTaxPercent(Number(existing.tax_percent || 0));
      setNotes(existing.notes || '');
      const ls = (existing.sales_return_items || []).map((it) => ({
        key: it.id,
        product_id: it.product_id,
        dispatch_item_id: it.dispatch_item_id,
        quantity: Number(it.quantity),
        weight_kg: it.weight_kg,
        rate: Number(it.rate),
        disposition: it.disposition,
        remarks: it.remarks || '',
      }));
      setLines(ls.length ? ls : [newLine()]);
    } else {
      setClientId(defaultClientId || '');
      setReturnDate(format(new Date(), 'yyyy-MM-dd'));
      setReason('rejection');
      setReference('');
      setReturnedBy('');
      setReceivedBy('');
      setVehicle('');
      setDriver('');
      const c = clients.find((cl) => cl.id === defaultClientId);
      setTaxPercent(Number(c?.default_tax_percent || 0));
      setNotes('');
      setLines([newLine()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  const onClientChange = (id: string) => {
    setClientId(id);
    if (!existing) {
      const c = clients.find((cl) => cl.id === id);
      if (c && c.default_tax_percent != null) setTaxPercent(Number(c.default_tax_percent) || 0);
    }
  };

  const updateLine = (key: string, patch: Partial<LineState>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onProduct = async (key: string, productId: string) => {
    updateLine(key, { product_id: productId, rate_source: undefined });
    if (!productId || !clientId) return;
    try {
      const { rate, source } = await fetchReturnRate(clientId, productId, returnDate);
      setLines((prev) =>
        prev.map((l) => (l.key === key && l.product_id === productId ? { ...l, rate, rate_source: source } : l)),
      );
    } catch {
      /* rate lookup is best-effort; user can type it */
    }
  };

  const totals = useMemo(() => {
    const sub = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0);
    const tax = Math.round(sub * (Number(taxPercent) || 0)) / 100;
    const qty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    return { sub, tax, total: sub + tax, qty };
  }, [lines, taxPercent]);

  const validLines = lines.filter((l) => l.product_id && Number(l.quantity) > 0);
  const canSave = !!clientId && validLines.length > 0 && !create.isPending && !update.isPending;

  const handleSave = async () => {
    if (!clientId) { toast.error('Select the customer'); return; }
    if (!validLines.length) { toast.error('Add at least one product with a quantity'); return; }
    const header: SalesReturnHeaderInput = {
      client_id: clientId,
      return_date: returnDate,
      reason,
      reference,
      returned_by: returnedBy,
      received_by: receivedBy,
      vehicle_number: vehicle,
      driver_name: driver,
      tax_percent: taxPercent,
      notes,
    };
    const payload = validLines.map(({ key: _k, rate_source: _s, ...rest }) => rest);
    if (existing) {
      await update.mutateAsync({ id: existing.id, header, lines: payload });
      onOpenChange(false);
      onSaved?.(existing.id);
    } else {
      const d = await create.mutateAsync({ header, lines: payload });
      onOpenChange(false);
      onSaved?.(d.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit Return ${existing.return_number}` : 'New Customer Return / Credit Note'}</DialogTitle>
          <DialogDescription>
            Goods coming back from a customer — any product, any quantity, not tied to one delivery challan.
            Saved as a draft; posting gates the material in, restores FG stock and issues the credit note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Label>Customer *</Label>
              <ClientSelector value={clientId} onChange={onClientChange} disabled={!!existing} />
            </div>
            <div>
              <Label>Return date</Label>
              <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as SalesReturnReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer reference (debit note / GRN #)</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Returned by (customer side)</Label>
              <Input value={returnedBy} onChange={(e) => setReturnedBy(e.target.value)} placeholder="Person / department" />
            </div>
            <div>
              <Label>Received by (our side)</Label>
              <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Store / gate" />
            </div>
            <div>
              <Label>Vehicle #</Label>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            </div>
            <div>
              <Label>Driver</Label>
              <Input value={driver} onChange={(e) => setDriver(e.target.value)} />
            </div>
            <div>
              <Label>Tax % (reversed on credit note)</Label>
              <Input type="number" step="0.01" min={0} value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} />
            </div>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Product</TableHead>
                  <TableHead className="text-right w-24">Qty (pcs)</TableHead>
                  <TableHead className="text-right w-28">Weight kg</TableHead>
                  <TableHead className="text-right w-32">Credit rate</TableHead>
                  <TableHead className="text-right w-32">Value</TableHead>
                  <TableHead className="w-36">Disposition</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.key}>
                    <TableCell>
                      <ProductSelector
                        value={l.product_id}
                        onChange={(v) => onProduct(l.key, v)}
                        preferClient={clientId || undefined}
                        placeholder={clientId ? 'Select product…' : 'Select customer first'}
                        disabled={!clientId}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        className="w-24 text-right ml-auto"
                        value={l.quantity || ''}
                        onChange={(e) => updateLine(l.key, { quantity: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step="0.001"
                        className="w-28 text-right ml-auto"
                        value={l.weight_kg ?? ''}
                        onChange={(e) => updateLine(l.key, { weight_kg: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-32 text-right ml-auto"
                        value={l.rate ?? ''}
                        onChange={(e) => updateLine(l.key, { rate: Number(e.target.value), rate_source: 'manual' })}
                      />
                      {l.rate_source && <div className="text-[10px] text-muted-foreground text-right">{l.rate_source}</div>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency((Number(l.quantity) || 0) * (Number(l.rate) || 0), { compact: false, decimals: 2 })}
                    </TableCell>
                    <TableCell>
                      <Select value={l.disposition} onValueChange={(v) => updateLine(l.key, { disposition: v as ReturnDisposition })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DISPOSITIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              <div>{d.label}</div>
                              <div className="text-[10px] text-muted-foreground">{d.hint}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={l.remarks || ''} onChange={(e) => updateLine(l.key, { remarks: e.target.value })} placeholder="e.g. short shot, colour off" />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== l.key) : [newLine()]))}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button size="sm" variant="outline" onClick={() => setLines((p) => [...p, newLine()])}>
            <Plus size={14} className="mr-1" /> Add product
          </Button>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Inspection findings, agreement with customer…" />
            </div>
            <div className="w-full md:w-72 space-y-1 text-sm border rounded-md p-3 bg-muted/30">
              <div className="flex justify-between"><span>Total pieces</span><span className="font-medium">{totals.qty.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.sub, { compact: false, decimals: 2 })}</span></div>
              <div className="flex justify-between"><span>Tax {taxPercent}%</span><span>{formatCurrency(totals.tax, { compact: false, decimals: 2 })}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold text-base"><span>Credit note value</span><span>{formatCurrency(totals.total, { compact: false, decimals: 2 })}</span></div>
              {validLines.some((l) => !(Number(l.rate) > 0)) && (
                <div className="text-xs text-destructive pt-1">Some lines have rate 0 and add no credit.</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {create.isPending || update.isPending ? 'Saving…' : existing ? 'Save changes' : 'Save draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
