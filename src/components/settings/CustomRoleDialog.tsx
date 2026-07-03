import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCustomRole, useUpdateCustomRole, CustomRole } from '@/hooks/useCustomRoles';

const COLOR_PRESETS = [
  { label: 'Indigo', value: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { label: 'Fuchsia', value: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300' },
  { label: 'Sky', value: 'bg-sky-100 text-sky-800 border-sky-300' },
  { label: 'Emerald', value: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: 'Amber', value: 'bg-amber-100 text-amber-800 border-amber-300' },
  { label: 'Rose', value: 'bg-rose-100 text-rose-800 border-rose-300' },
  { label: 'Slate', value: 'bg-slate-100 text-slate-800 border-slate-300' },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  role?: CustomRole | null;
}

export function CustomRoleDialog({ open, onOpenChange, role }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0].value);
  const create = useCreateCustomRole();
  const update = useUpdateCustomRole();
  const isEdit = !!role;

  useEffect(() => {
    if (open) {
      setName(role?.name ?? '');
      setDescription(role?.description ?? '');
      setColor(role?.color ?? COLOR_PRESETS[0].value);
    }
  }, [open, role]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEdit && role) {
      await update.mutateAsync({ id: role.id, updates: { name, description, color } });
    } else {
      await create.mutateAsync({ name, description, color });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Custom Role' : 'New Custom Role'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Night Shift Lead" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for" rows={2} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`px-2 py-1 rounded border text-xs ${c.value} ${color === c.value ? 'ring-2 ring-primary' : ''}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || create.isPending || update.isPending}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
