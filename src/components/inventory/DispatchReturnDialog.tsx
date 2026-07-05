import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDispatchItems } from '@/hooks/useDispatches';
import { useCreateDispatchReturn } from '@/hooks/useDispatchReturns';

interface DispatchReturnDialogProps {
  dispatch: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReturnLine {
  dispatch_item_id: string;
  return_qty: number;
  weight_kg: number;
  remarks: string;
}

export function DispatchReturnDialog({ dispatch, open, onOpenChange }: DispatchReturnDialogProps) {
  const { data: items = [] } = useDispatchItems(dispatch?.id);
  const createReturn = useCreateDispatchReturn();
  const [reason, setReason] = useState('');
  const [returnedBy, setReturnedBy] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<ReturnLine[]>([]);

  useEffect(() => {
    if (items.length) {
      setLines(items.map(i => ({
        dispatch_item_id: i.id,
        return_qty: 0,
        weight_kg: 0,
        remarks: '',
      })));
    }
  }, [items]);

  const updateLine = (idx: number, field: keyof ReturnLine, value: any) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handleSubmit = () => {
    const validLines = lines.filter(l => l.return_qty > 0);
    if (!validLines.length) return;

    createReturn.mutate({
      dispatchId: dispatch.id,
      reason,
      returned_by: returnedBy,
      remarks,
      items: validLines,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setReason('');
        setReturnedBy('');
        setRemarks('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return Dispatch — {dispatch?.dispatch_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Reason</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for return" />
            </div>
            <div>
              <Label>Returned By</Label>
              <Input value={returnedBy} onChange={e => setReturnedBy(e.target.value)} placeholder="Person name" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Dispatched Qty</TableHead>
                  <TableHead className="text-right">Return Qty</TableHead>
                  <TableHead className="text-right">Weight KG</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.products?.name}</TableCell>
                    <TableCell className="text-right font-medium">{item.total_qty}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={item.total_qty}
                        className="w-20 text-right ml-auto"
                        value={lines[idx]?.return_qty || 0}
                        onChange={e => updateLine(idx, 'return_qty', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.001"
                        className="w-24 text-right ml-auto"
                        value={lines[idx]?.weight_kg || 0}
                        onChange={e => updateLine(idx, 'weight_kg', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-32"
                        value={lines[idx]?.remarks || ''}
                        onChange={e => updateLine(idx, 'remarks', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Additional remarks" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createReturn.isPending || !lines.some(l => l.return_qty > 0)}
          >
            {createReturn.isPending ? 'Saving...' : 'Create Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
