import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Voucher, VOUCHER_TYPES, useVoucherLines, usePostVoucher, useReverseVoucher, useDeleteVoucher } from '@/hooks/useVouchers';
import { formatCurrencyFull } from '@/lib/currency';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  posted: 'default',
  reversed: 'destructive',
};

interface VoucherDetailDialogProps {
  voucher: Voucher | null;
  onClose: () => void;
}

export function VoucherDetailDialog({ voucher, onClose }: VoucherDetailDialogProps) {
  const { data: lines = [] } = useVoucherLines(voucher?.id);
  const post = usePostVoucher();
  const reverse = useReverseVoucher();
  const del = useDeleteVoucher();
  const [reverseMode, setReverseMode] = useState(false);
  const [reason, setReason] = useState('');

  if (!voucher) return null;

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);

  return (
    <Dialog open={!!voucher} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {voucher.voucher_number}
            <Badge variant={statusVariant[voucher.status]}>{voucher.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Type</div>
            {VOUCHER_TYPES[voucher.voucher_type] || voucher.voucher_type}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Date</div>
            {format(new Date(voucher.voucher_date), 'dd MMM yyyy')}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Reference</div>
            {voucher.reference || '—'}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Posted</div>
            {voucher.posted_at ? format(new Date(voucher.posted_at), 'dd MMM yyyy HH:mm') : '—'}
          </div>
        </div>
        {voucher.narration && <p className="text-sm text-muted-foreground">{voucher.narration}</p>}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  {l.chart_of_accounts ? `${l.chart_of_accounts.code} — ${l.chart_of_accounts.name}` : l.account_id}
                </TableCell>
                <TableCell className="text-muted-foreground">{l.description || ''}</TableCell>
                <TableCell className="text-right">{Number(l.debit) > 0 ? formatCurrencyFull(Number(l.debit)) : ''}</TableCell>
                <TableCell className="text-right">{Number(l.credit) > 0 ? formatCurrencyFull(Number(l.credit)) : ''}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right">{formatCurrencyFull(totalDebit)}</TableCell>
              <TableCell className="text-right">{formatCurrencyFull(totalCredit)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {reverseMode ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Reversal reason</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being reversed?" />
            </div>
            <Button
              variant="destructive"
              disabled={reverse.isPending}
              onClick={() =>
                reverse.mutate({ voucherId: voucher.id, reason: reason || undefined }, { onSuccess: onClose })
              }
            >
              Confirm Reversal
            </Button>
            <Button variant="outline" onClick={() => setReverseMode(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            {voucher.status === 'draft' && (
              <>
                <Button
                  variant="destructive"
                  disabled={del.isPending}
                  onClick={() => del.mutate(voucher.id, { onSuccess: onClose })}
                >
                  Delete Draft
                </Button>
                <Button disabled={post.isPending} onClick={() => post.mutate(voucher.id, { onSuccess: onClose })}>
                  Post
                </Button>
              </>
            )}
            {voucher.status === 'posted' && (
              <Button variant="destructive" onClick={() => setReverseMode(true)}>
                Reverse…
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
