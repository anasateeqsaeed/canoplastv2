import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreateArReceipt, useOutstandingInvoices } from '@/hooks/useArReceipts';
import { formatCurrencyFull } from '@/lib/currency';

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ open, onOpenChange }: ReceiptDialogProps) {
  const [clientId, setClientId] = useState('');
  const [receiptDate, setReceiptDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'cash' | 'bank' | 'cheque'>('bank');
  const [bankAccountId, setBankAccountId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const { data: banks = [] } = useBankAccounts();
  const { data: invoices = [] } = useOutstandingInvoices(clientId || undefined);
  const create = useCreateArReceipt();

  useEffect(() => setAllocations({}), [clientId]);

  const allocTotal = useMemo(
    () => Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [allocations],
  );
  const amountNum = parseFloat(amount) || 0;

  /** FIFO auto-allocation of the receipt amount across oldest invoices. */
  const autoAllocate = () => {
    let remaining = amountNum;
    const next: Record<string, string> = {};
    for (const inv of invoices) {
      if (remaining <= 0) break;
      const outstanding = Number(inv.total_amount) - Number(inv.amount_paid);
      const take = Math.min(outstanding, remaining);
      next[inv.id] = take.toFixed(2);
      remaining -= take;
    }
    setAllocations(next);
  };

  const reset = () => {
    setClientId('');
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
    !!clientId && amountNum > 0 && allocTotal <= amountNum + 0.005 &&
    (mode === 'cash' || !!bankAccountId) && (mode !== 'cheque' || !!chequeNumber);

  const save = () =>
    create.mutate(
      {
        client_id: clientId,
        receipt_date: receiptDate,
        amount: amountNum,
        mode,
        bank_account_id: mode === 'cash' ? null : bankAccountId,
        cheque_number: mode === 'cheque' ? chequeNumber : null,
        cheque_date: mode === 'cheque' ? chequeDate || null : null,
        reference: reference || null,
        notes: notes || null,
        allocations: Object.entries(allocations)
          .filter(([, v]) => parseFloat(v) > 0)
          .map(([invoice_id, v]) => ({ invoice_id, amount: parseFloat(v) })),
      },
      { onSuccess: () => { reset(); onOpenChange(false); } },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Customer Receipt</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-muted-foreground">Customer</label>
            <ClientSelector value={clientId} onChange={(v) => setClientId(v)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
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
              <label className="text-xs text-muted-foreground">Deposit To</label>
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

        {clientId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Apply against invoices</h4>
              <Button variant="outline" size="sm" disabled={!amountNum || invoices.length === 0} onClick={autoAllocate}>
                Auto-allocate (FIFO)
              </Button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding invoices — receipt will sit as an advance on the customer ledger.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="w-36 text-right">Allocate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.invoice_number}</TableCell>
                      <TableCell>{format(new Date(inv.invoice_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyFull(Number(inv.total_amount) - Number(inv.amount_paid))}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min="0" step="0.01" className="text-right"
                          value={allocations[inv.id] || ''}
                          onChange={(e) => setAllocations((p) => ({ ...p, [inv.id]: e.target.value }))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="text-sm text-right text-muted-foreground">
              Allocated {formatCurrencyFull(allocTotal)} of {formatCurrencyFull(amountNum)}
              {allocTotal > amountNum + 0.005 && <span className="text-destructive"> — exceeds receipt amount</span>}
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
