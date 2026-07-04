import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeaveTypes, useCreateLeaveApplication, calculateLeaveDays } from '@/hooks/useLeave';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LeaveApplicationDialog({ open, onOpenChange }: Props) {
  const { data: employees = [] } = useEmployees();
  const { data: types = [] } = useLeaveTypes();
  const createMut = useCreateLeaveApplication();

  const [employeeId, setEmployeeId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');

  const days = calculateLeaveDays(from, to);

  const handleSubmit = async () => {
    if (!employeeId || !typeId || !from || !to) return;
    await createMut.mutateAsync({
      employee_id: employeeId,
      leave_type_id: typeId,
      from_date: from,
      to_date: to,
      days,
      reason,
      status: 'pending',
    });
    setEmployeeId(''); setTypeId(''); setFrom(''); setTo(''); setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Leave Application</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.filter((e: any) => e.is_active).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Leave Type</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {types.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.is_paid ? '(Paid)' : '(Unpaid)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Working days (excl. Fridays): <strong>{days}</strong>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending || !employeeId || !typeId || days < 1}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
