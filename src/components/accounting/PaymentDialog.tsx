import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SupplierSelector } from '@/components/selectors/SupplierSelector';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreateApPayment, useOutstandingBills } from '@/hooks/useApBills';
import { formatCurrencyFull } from '@/lib/currency';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDialog({ open, onOpenChange }: PaymentDialogProps) {
  const [supplierId, setSupplierId] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'cash' | 'bank' | 'cheque'>('bank');
  const [bankAccountId, setBankAccountId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const { data: banks = [] } = useBankAccounts();
  const { data: bills = [] } = useOutstandingBills(supplierId || undefined);
  const create = useCreateApPayment();

  useEffect(() => setAllocations({}), [supplierId]);

  const allocTotal = useMemo(
    () => Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [allocations],
  );
  const amountNum = parseFloat(amount) || 0;

  const autoAllocate = () => {
    let remaining = amountNum;
    const next: Record<string, string> = {};
    for (const bill of bills) {
      if (remaining <= 0) break;
      const outstanding = Number(bill.total_amount) - Number(bill.amount_paid);
      const take = Math.min(outstanding, remaining);
      next[bill.id] = take.toFixed(2);
      remaining -= take;
    }
    setAllocations(next);
  };

  const reset = () => {
    setSupplierId('');
    setAmount('');
    setMode('bank');
    setBankAccountId('');
    setChequeNumber('');
    setChequeDate('');
    setReference('');
    setNotes('');
    setAllocations({});
  };

  const canSave =
    !!supplierId && amountNum > 0 && allocTotal <= amountNum + 0.005 &&
    (mode === 'cash' || !!bankAccountId) && (mode !== 'cheque' || !!chequeNumber);

  const save = () =>
    create.mutate(
      {
        supplier_id: supplierId,
        payment_date: paymentDate,
        amount: amountNum,
        mode,
        bank_account_id: mode === 'cash' ? null : bankAccountId,
        cheque_number: mode === 'cheque' ? chequeNumber : null,
        cheque_date: mode === 'cheque' ? chequeDate || null : null,
        reference: reference || null,
        notes: notes || null,
        allocations: Object.entries(allocations)
          .filter(([, v]) => parseFloat(v) > 0)
          .map(([bill_id, v]) => ({ bill_id, amount: parseFloat(v) })),
      },
      { onSuccess: () => { reset(); onOpenChange(false); } },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Vendor Payment</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-muted-foreground">Supplier</label>
            <SupplierSelector value={supplierId} onChange={(v) => setSupplierId(v)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Amount (Rs)</label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Mode</label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode !== 'cash' && (
            <div>
              <label className="text-xs text-muted-foreground">Pay From</label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {banks.filter((b) => b.is_active).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === 'cheque' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Cheque No</label>
                <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cheque Date</label>
                <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Reference</label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>

        {supplierId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Apply against bills</h4>
              <Button variant="outline" size="sm" disabled={!amountNum || bills.length === 0} onClick={autoAllocate}>
                Auto-allocate (FIFO)
              </Button>
            </div>
            {bills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding posted bills — payment will sit as an advance on the vendor ledger.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="w-36 text-right">Allocate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.bill_number}</TableCell>
                      <TableCell>{format(new Date(bill.bill_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyFull(Number(bill.total_amount) - Number(bill.amount_paid))}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min="0" step="0.01" className="text-right"
                          value={allocations[bill.id] || ''}
                          onChange={(e) => setAllocations((p) => ({ ...p, [bill.id]: e.target.value }))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="text-sm text-right text-muted-foreground">
              Allocated {formatCurrencyFull(allocTotal)} of {formatCurrencyFull(amountNum)}
              {allocTotal > amountNum + 0.005 && <span className="text-destructive"> — exceeds payment amount</span>}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!canSave || create.isPending} onClick={save}>Save &amp; Post</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
