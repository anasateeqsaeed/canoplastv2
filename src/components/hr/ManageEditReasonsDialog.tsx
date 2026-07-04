import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useAttendanceEditReasons,
  useQuickAddReason,
  useUpdateReason,
} from '@/hooks/useAttendanceEditReasons';
import { Plus } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ManageEditReasonsDialog({ open, onOpenChange }: Props) {
  const { data: reasons = [] } = useAttendanceEditReasons(false);
  const quickAdd = useQuickAddReason();
  const update = useUpdateReason();
  const [label, setLabel] = useState('');
  const [desc, setDesc] = useState('');

  const add = async () => {
    await quickAdd.mutateAsync({ label, description: desc });
    setLabel('');
    setDesc('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage edit reasons</DialogTitle>
          <DialogDescription>
            System reasons can be deactivated but not deleted. Custom reasons may be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded border p-3">
          <div className="text-sm font-medium">Add new reason</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Half-day Conversion" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={1} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={add} disabled={label.trim().length < 3 || quickAdd.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasons.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{r.label}</TableCell>
                  <TableCell className="text-xs font-mono">{r.code}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.is_system ? 'System' : 'Custom'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) =>
                        update.mutate({ id: r.id, patch: { is_active: v } })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
