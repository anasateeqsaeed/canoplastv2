import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { AccountSelector } from './AccountSelector';
import { useCreateVoucher } from '@/hooks/useVouchers';
import { formatCurrencyFull } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface LineDraft {
  account_id: string;
  description: string;
  debit: string;
  credit: string;
}

const emptyLine = (): LineDraft => ({ account_id: '', description: '', debit: '', credit: '' });

interface VoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** JV for normal entries, OB for opening balances */
  defaultType?: 'JV' | 'OB';
}

export function VoucherDialog({ open, onOpenChange, defaultType = 'JV' }: VoucherDialogProps) {
  const [voucherType, setVoucherType] = useState<string>(defaultType);
  const [voucherDate, setVoucherDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [narration, setNarration] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);
  const create = useCreateVoucher();

  const totals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 };
  }, [lines]);

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const reset = () => {
    setVoucherType(defaultType);
    setVoucherDate(format(new Date(), 'yyyy-MM-dd'));
    setNarration('');
    setReference('');
    setLines([emptyLine(), emptyLine()]);
  };

  const save = (post: boolean) => {
    const validLines = lines.filter((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    create.mutate(
      {
        voucher_type: voucherType,
        voucher_date: voucherDate,
        narration,
        reference,
        post,
        lines: validLines.map((l) => ({
          account_id: l.account_id,
          description: l.description || undefined,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Voucher</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={voucherType} onValueChange={setVoucherType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="JV">JV — Journal Voucher</SelectItem>
                <SelectItem value="OB">OB — Opening Balance</SelectItem>
                <SelectItem value="BP">BP — Bank Payment</SelectItem>
                <SelectItem value="BR">BR — Bank Receipt</SelectItem>
                <SelectItem value="CP">CP — Cash Payment</SelectItem>
                <SelectItem value="TR">TR — Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Reference</label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bill no, cheque no…" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Narration</label>
          <Textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={2} placeholder="What is this entry for?" />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%]">Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-28 text-right">Debit</TableHead>
              <TableHead className="w-28 text-right">Credit</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell>
                  <AccountSelector value={l.account_id} onChange={(v) => setLine(i, { account_id: v })} />
                </TableCell>
                <TableCell>
                  <Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input
                    type="number" min="0" step="0.01" className="text-right" value={l.debit}
                    onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number" min="0" step="0.01" className="text-right" value={l.credit}
                    onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="icon" disabled={lines.length <= 2}
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
          <div className={cn('text-sm font-medium', totals.balanced ? 'text-green-600' : 'text-destructive')}>
            Dr {formatCurrencyFull(totals.debit)} · Cr {formatCurrencyFull(totals.credit)}
            {totals.balanced ? ' — balanced' : ' — not balanced'}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" disabled={create.isPending} onClick={() => save(false)}>
            Save as Draft
          </Button>
          <Button disabled={!totals.balanced || create.isPending} onClick={() => save(true)}>
            Save &amp; Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
