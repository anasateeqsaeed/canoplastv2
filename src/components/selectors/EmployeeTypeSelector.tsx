import { useMemo, useState } from 'react';
import { SearchableComboBox, ComboBoxOption } from '@/components/ui/searchable-combobox';
import { Briefcase, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployeeTypes, useCreateEmployeeType } from '@/hooks/useEmployeeTypes';

interface Props {
  value: string | null | undefined;
  onChange: (id: string, type?: { id: string; name: string; category: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowAdd?: boolean;
}

export function EmployeeTypeSelector({
  value,
  onChange,
  placeholder = 'Select employee type…',
  disabled,
  className,
  allowAdd = true,
}: Props) {
  const { data: types = [], isLoading } = useEmployeeTypes();
  const createMut = useCreateEmployeeType();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', category: 'factory' as 'factory' | 'office' });

  const options = useMemo<ComboBoxOption[]>(
    () =>
      types.map((t) => ({
        value: t.id,
        label: t.name,
        description: `${t.code} • ${t.category === 'factory' ? 'Factory' : 'Office'}`,
        icon: <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />,
      })),
    [types]
  );

  const handleAdd = async () => {
    const created = await createMut.mutateAsync({
      name: form.name,
      code: form.code || form.name.replace(/\s+/g, '_').toUpperCase().slice(0, 20),
      category: form.category,
      sort_order: (types[types.length - 1]?.sort_order || 100) + 10,
      is_active: true,
    });
    onChange(created.id, { id: created.id, name: created.name, category: created.category });
    setAddOpen(false);
    setForm({ name: '', code: '', category: 'factory' });
  };

  return (
    <div className={className}>
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">
          <SearchableComboBox
            value={value || ''}
            onChange={(v) => {
              const t = types.find((x) => x.id === v);
              onChange(v, t ? { id: t.id, name: t.name, category: t.category } : undefined);
            }}
            options={options}
            placeholder={isLoading ? 'Loading…' : placeholder}
            searchPlaceholder="Search types…"
            emptyMessage="No types found"
            disabled={disabled || isLoading}
          />
        </div>
        {allowAdd && (
          <Button type="button" variant="outline" size="icon" onClick={() => setAddOpen(true)} title="Add new type">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employee Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Helper, Machinist"
              />
            </div>
            <div>
              <Label>Code (optional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                placeholder="Auto from name"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v: any) => setForm((s) => ({ ...s, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="factory">Factory (operator-style)</SelectItem>
                  <SelectItem value="office">Office (staff-style)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim() || createMut.isPending}>
              {createMut.isPending ? 'Adding…' : 'Add type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
