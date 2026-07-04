import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ReasonPicker } from './ReasonPicker';
import { useAttendanceEditReasons } from '@/hooks/useAttendanceEditReasons';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editCount: number;
  onConfirm: (payload: { code: string; note: string | null }) => void;
}

export function EditReasonDialog({ open, onOpenChange, editCount, onConfirm }: Props) {
  const [code, setCode] = useState<string>('');
  const [note, setNote] = useState('');
  const { data: reasons = [] } = useAttendanceEditReasons(true);

  useEffect(() => {
    if (open) {
      setCode('');
      setNote('');
    }
  }, [open]);

  const selected = useMemo(() => reasons.find((r) => r.code === code), [reasons, code]);
  const noteRequired = selected?.code === 'OTHER';
  const canSave =
    !!code && (!noteRequired || note.trim().length >= 3);

  const submit = () => {
    if (!canSave) return;
    onConfirm({ code, note: note.trim() ? note.trim() : null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reason for attendance change</DialogTitle>
          <DialogDescription>
            You are editing {editCount} existing attendance record{editCount === 1 ? '' : 's'}.
            Pick a standard reason — repeated reasons are tracked so HR can act on patterns.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Reason (required)</Label>
            <ReasonPicker value={code} onChange={setCode} />
            {selected?.description && (
              <p className="text-[11px] text-muted-foreground">{selected.description}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Note {noteRequired ? '(required)' : '(optional)'}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional extra detail…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSave}>
            Save with reason
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
