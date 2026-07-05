import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClients } from '@/hooks/useClients';
import { useUnbilledDispatches, useCreateConsolidatedInvoice } from '@/hooks/useSalesInvoices';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function GenerateInvoiceDialog({ open, onOpenChange }: Props) {
  const { data: clients = [] } = useClients();
  const [clientId, setClientId] = useState<string>('');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 86400_000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [taxPercent, setTaxPercent] = useState(0);
  const [freight, setFreight] = useState(0);
  const [other, setOther] = useState(0);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: dispatches = [], isLoading } = useUnbilledDispatches(clientId || null, startDate, endDate);
  const create = useCreateConsolidatedInvoice();

  const lineValue = (d: any) =>
    (d.dispatch_items || []).reduce((s: number, i: any) => s + Number(i.total_qty || 0) * Number(i.agreed_selling_price || 0), 0);

  const summary = useMemo(() => {
    const arr = dispatches.filter((d: any) => selected.has(d.id));
    const sub = arr.reduce((s, d: any) => s + lineValue(d), 0);
    const tax = +(sub * taxPercent / 100).toFixed(2);
    return { sub, tax, total: sub + tax + Number(freight) + Number(other), count: arr.length };
  }, [dispatches, selected, taxPercent, freight, other]);

  const toggleAll = () => {
    if (selected.size === dispatches.length) setSelected(new Set());
    else setSelected(new Set(dispatches.map((d: any) => d.id)));
  };

  const onClient = (id: string) => {
    setClientId(id);
    setSelected(new Set());
    const c = clients.find((cl) => cl.id === id);
    if (c && (c as any).default_tax_percent != null) setTaxPercent(Number((c as any).default_tax_percent) || 0);
  };

  const handleCreate = async () => {
    if (!clientId || selected.size === 0) { toast.error('Select a customer and at least one dispatch'); return; }
    await create.mutateAsync({
      client_id: clientId,
      invoice_date: invoiceDate,
      period_from: startDate,
      period_to: endDate,
      tax_percent: Number(taxPercent),
      freight_charges: Number(freight),
      other_charges: Number(other),
      notes,
      dispatch_ids: Array.from(selected),
    });
    onOpenChange(false);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Generate Consolidated Invoice</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Customer</Label>
              <Select value={clientId} onValueChange={onClient}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>From</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <div><Label>Invoice Date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
          </div>

          <div className="border rounded-md overflow-x-auto max-h-80">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={dispatches.length > 0 && selected.size === dispatches.length} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>DC #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Pieces</TableHead>
                  <TableHead className="text-right">Sale Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!clientId ? <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Select a customer</TableCell></TableRow>
                  : isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-4">Loading…</TableCell></TableRow>
                  : dispatches.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No unbilled dispatches in range</TableCell></TableRow>
                  : dispatches.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell><Checkbox checked={selected.has(d.id)} onCheckedChange={(c) => {
                        const next = new Set(selected); c ? next.add(d.id) : next.delete(d.id); setSelected(next);
                      }} /></TableCell>
                      <TableCell className="font-mono text-xs">{d.dispatch_number}</TableCell>
                      <TableCell>{format(new Date(d.dispatch_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{d.vehicle_number || '—'}</TableCell>
                      <TableCell className="text-right">{d.total_pieces}</TableCell>
                      <TableCell className="text-right">{formatCurrency(lineValue(d), { compact: false })}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Tax %</Label><Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} /></div>
            <div><Label>Freight</Label><Input type="number" value={freight} onChange={(e) => setFreight(Number(e.target.value))} /></div>
            <div><Label>Other Charges</Label><Input type="number" value={other} onChange={(e) => setOther(Number(e.target.value))} /></div>
            <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>

          <div className="bg-muted/50 rounded-md p-3 grid grid-cols-4 gap-3 text-sm">
            <div><div className="text-muted-foreground">Selected</div><div className="font-semibold">{summary.count}</div></div>
            <div><div className="text-muted-foreground">Subtotal</div><div className="font-semibold">{formatCurrency(summary.sub, { compact: false })}</div></div>
            <div><div className="text-muted-foreground">Tax</div><div className="font-semibold">{formatCurrency(summary.tax, { compact: false })}</div></div>
            <div><div className="text-muted-foreground">Grand Total</div><div className="font-semibold text-primary">{formatCurrency(summary.total, { compact: false })}</div></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={create.isPending || selected.size === 0}>Create Invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
