import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { SupplierSelector } from '@/components/selectors/SupplierSelector';
import { AccountSelector } from './AccountSelector';
import { useCreateApBill } from '@/hooks/useApBills';
import { formatCurrencyFull } from '@/lib/currency';

interface LineDraft {
  account_id: string;
  description: string;
  amount: string;
}

const emptyLine = (): LineDraft => ({ account_id: '', description: '', amount: '' });

interface BillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillDialog({ open, onOpenChange }: BillDialogProps) {
  const [supplierId, setSupplierId] = useState('');
  const [billDate, setBillDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState('');
  const [vendorBillNo, setVendorBillNo] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const create = useCreateApBill();

  const subtotal = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0), [lines]);
  const total = subtotal + (parseFloat(taxAmount) || 0);

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const reset = () => {
    setSupplierId('');
    setDueDate('');
    setVendorBillNo('');
    setTaxAmount('');
    setNarration('');
    setLines([emptyLine()]);
  };

  const validLines = lines.filter((l) => l.account_id && parseFloat(l.amount) > 0);
  const canSave = !!supplierId && validLines.length > 0;

  const save = (post: boolean) =>
    create.mutate(
      {
        supplier_id: supplierId,
        bill_date: billDate,
        due_date: dueDate || null,
        vendor_bill_no: vendorBillNo || null,
        tax_amount: parseFloat(taxAmount) || 0,
        narration: narration || null,
        post,
        lines: validLines.map((l) => ({
          account_id: l.account_id,
          description: l.description || undefined,
          amount: parseFloat(l.amount),
        })),
      },
      { onSuccess: () => { reset(); onOpenChange(false); } },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Vendor Bill</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Supplier</label>
            <SupplierSelector value={supplierId} onChange={(v) => setSupplierId(v)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Bill Date</label>
            <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Vendor Bill / Invoice No</label>
            <Input value={vendorBillNo} onChange={(e) => setVendorBillNo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">GST / Tax (Rs)</label>
            <Input type="number" min="0" step="0.01" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Expense / Stock Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell>
                  <AccountSelector
                    value={l.account_id}
                    onChange={(v) => setLine(i, { account_id: v })}
                    types={['expense', 'asset']}
                  />
                </TableCell>
                <TableCell>
                  <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input
                    type="number" min="0" step="0.01" className="text-right"
                    value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="icon" disabled={lines.length <= 1}
                    onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
            <Plus size={16} className="mr-1" /> Add line
          </Button>
          <div className="text-sm font-medium">
            Subtotal {formatCurrencyFull(subtotal)} · Total {formatCurrencyFull(total)}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Narration</label>
          <Textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={2} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" disabled={!canSave || create.isPending} onClick={() => save(false)}>
            Save as Draft
          </Button>
          <Button disabled={!canSave || create.isPending} onClick={() => save(true)}>
            Save &amp; Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
