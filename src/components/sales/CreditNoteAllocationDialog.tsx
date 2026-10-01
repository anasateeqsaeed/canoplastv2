import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import { useClientOpenInvoices, useSetSalesReturnAllocations, type SalesReturn } from '@/hooks/useSalesReturns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  salesReturn: SalesReturn;
}

/** Apply a posted credit note against the customer's issued invoices. */
export function CreditNoteAllocationDialog({ open, onOpenChange, salesReturn }: Props) {
  const { data: invoices = [], isLoading } = useClientOpenInvoices(open ? salesReturn.client_id : undefined);
  const save = useSetSalesReturnAllocations();
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    const init: Record<string, number> = {};
    (salesReturn.sales_return_allocations || []).forEach((a) => { init[a.invoice_id] = Number(a.amount); });
    setAmounts(init);
  }, [open, salesReturn.id, salesReturn.sales_return_allocations]);

  const existingFor = (invId: string) =>
    Number((salesReturn.sales_return_allocations || []).find((a) => a.invoice_id === invId)?.amount || 0);

  // Outstanding excluding what THIS credit note already applied (so re-editing works)
  const rows = useMemo(
    () =>
      invoices
        .map((inv) => ({
          ...inv,
          outstanding: Number(inv.total_amount) - Number(inv.amount_paid) + existingFor(inv.id),
        }))
        .filter((inv) => inv.outstanding > 0.005 || existingFor(inv.id) > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, salesReturn.sales_return_allocations],
  );

  const applied = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const creditValue = Number(salesReturn.total_amount || 0);
  const remaining = creditValue - applied;
  const over = rows.some((r) => (amounts[r.id] || 0) > r.outstanding + 0.005) || remaining < -0.005;

  const autoFill = () => {
    let left = creditValue;
    const next: Record<string, number> = {};
    [...rows]
      .sort((a, b) => a.invoice_date.localeCompare(b.invoice_date))
      .forEach((r) => {
        if (left <= 0) return;
        const amt = Math.min(left, r.outstanding);
        if (amt > 0) { next[r.id] = Math.round(amt * 100) / 100; left -= amt; }
      });
    setAmounts(next);
  };

  const handleSave = async () => {
    const allocations = Object.entries(amounts)
      .filter(([, v]) => Number(v) > 0)
      .map(([invoice_id, amount]) => ({ invoice_id, amount: Number(amount) }));
    await save.mutateAsync({ id: salesReturn.id, allocations });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Apply Credit Note {salesReturn.credit_note_number}</DialogTitle>
          <DialogDescription>
            Choose which issued invoices this credit reduces. Anything left unapplied stays on the customer's account as an open credit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Credit note value</div><div className="font-semibold">{formatCurrency(creditValue, { compact: false, decimals: 2 })}</div></div>
          <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Applied</div><div className="font-semibold">{formatCurrency(applied, { compact: false, decimals: 2 })}</div></div>
          <div className={`border rounded-md p-3 ${remaining < -0.005 ? 'border-destructive' : ''}`}><div className="text-xs text-muted-foreground">Unapplied (on account)</div><div className="font-semibold">{formatCurrency(remaining, { compact: false, decimals: 2 })}</div></div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={autoFill} disabled={!rows.length}>Auto-apply oldest first</Button>
        </div>

        <div className="overflow-x-auto max-h-[50vh] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right w-40">Apply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No issued invoices with a balance for this customer.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.invoice_number_override || r.invoice_number}</TableCell>
                  <TableCell>{format(new Date(r.invoice_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.total_amount), { compact: false, decimals: 2 })}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.outstanding, { compact: false, decimals: 2 })}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      max={r.outstanding}
                      className={`w-36 text-right ml-auto ${(amounts[r.id] || 0) > r.outstanding + 0.005 ? 'border-destructive' : ''}`}
                      value={amounts[r.id] ?? ''}
                      onChange={(e) => setAmounts((p) => ({ ...p, [r.id]: Number(e.target.value) }))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={save.isPending || over}>
            {save.isPending ? 'Saving…' : 'Save allocation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
