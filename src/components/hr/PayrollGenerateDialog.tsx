import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { useGeneratePayrollRun } from '@/hooks/usePayroll';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (runId: string) => void;
}

export function PayrollGenerateDialog({ open, onOpenChange, onCreated }: Props) {
  const today = new Date();
  const defaultMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM');
  const [month, setMonth] = useState(defaultMonth);
  const [workingDays, setWorkingDays] = useState(26);
  const [notes, setNotes] = useState('');
  const generate = useGeneratePayrollRun();

  useEffect(() => {
    if (open) {
      setMonth(defaultMonth);
      setWorkingDays(26);
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async () => {
    const periodMonth = `${month}-01`;
    const run = await generate.mutateAsync({ periodMonth, workingDays, notes: notes || undefined });
    onOpenChange(false);
    onCreated?.(run.id);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Monthly Payroll</DialogTitle>
        </DialogHeader>
        <div>
          <form onSubmit={onFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payroll-month">Month *</Label>
              <Input
                id="payroll-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payroll-working-days">Working days (divisor) *</Label>
              <Input
                id="payroll-working-days"
                type="number"
                min={20}
                max={31}
                value={workingDays}
                onChange={(e) => setWorkingDays(Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Daily wage = Basic ÷ Working days. Standard is 26 (Pakistan).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payroll-notes">Notes</Label>
              <Textarea
                id="payroll-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={generate.isPending}>
                {generate.isPending ? 'Generating…' : 'Generate'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
