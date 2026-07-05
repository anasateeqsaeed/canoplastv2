import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAcceptQuotation } from '@/hooks/useSales';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quotationId: string | null;
  quoteNumber?: string;
}

export function AcceptQuotationDialog({ open, onOpenChange, quotationId, quoteNumber }: Props) {
  const accept = useAcceptQuotation();
  const navigate = useNavigate();
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [requiredDate, setRequiredDate] = useState('');

  const onConfirm = async () => {
    if (!quotationId || !poNumber.trim()) return;
    const soId = await accept.mutateAsync({
      quotationId,
      customerPoNumber: poNumber.trim(),
      customerPoDate: poDate,
      requiredDate: requiredDate || null,
    });
    onOpenChange(false);
    setPoNumber('');
    navigate(`/sales/orders/${soId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Accept {quoteNumber} & Create Sales Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Customer PO Number *</Label>
            <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-12345" />
          </div>
          <div>
            <Label>Customer PO Date *</Label>
            <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
          </div>
          <div>
            <Label>Required Date</Label>
            <Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={!poNumber.trim() || accept.isPending}>
            {accept.isPending ? 'Creating…' : 'Create Sales Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
