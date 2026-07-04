import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import {
  useAttendanceEditReasons,
  useQuickAddReason,
} from '@/hooks/useAttendanceEditReasons';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  value: string | null;
  onChange: (code: string) => void;
  className?: string;
}

export function ReasonPicker({ value, onChange, className }: Props) {
  const { data: reasons = [], isLoading } = useAttendanceEditReasons(true);
  const quickAdd = useQuickAddReason();
  const { isAdmin, isHRManager } = useAuth();
  const canAdd = isAdmin() || isHRManager();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [desc, setDesc] = useState('');

  const submit = async () => {
    const created = await quickAdd.mutateAsync({ label, description: desc });
    onChange(created.code);
    setLabel('');
    setDesc('');
    setOpen(false);
  };

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <div className="flex-1">
        <Select value={value ?? ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Loading…' : 'Select a reason…'} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {reasons.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {canAdd && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="Add new reason">
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3" align="end">
            <div className="space-y-1">
              <Label className="text-xs">New reason label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Power Cut Adjustment"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                placeholder="When to use this reason…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={label.trim().length < 3 || quickAdd.isPending}
              >
                {quickAdd.isPending ? 'Adding…' : 'Add & select'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
