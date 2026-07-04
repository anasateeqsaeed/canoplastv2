import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import {
  useEmployeeTypes,
  useCreateEmployeeType,
  useUpdateEmployeeType,
  useDeleteEmployeeType,
  EmployeeType,
} from '@/hooks/useEmployeeTypes';
import { useHrWorkPatterns } from '@/hooks/useHrWorkPatterns';

interface FormState {
  code: string;
  name: string;
  category: 'factory' | 'office';
  sort_order: number;
  is_active: boolean;
  default_work_pattern_id: string | null;
}

const empty: FormState = { code: '', name: '', category: 'factory', sort_order: 100, is_active: true, default_work_pattern_id: null };

export default function EmployeeTypesSettings() {
  const { data: types = [], isLoading } = useEmployeeTypes({ includeInactive: true });
  const { data: patterns = [] } = useHrWorkPatterns();
  const createMut = useCreateEmployeeType();
  const updateMut = useUpdateEmployeeType();
  const deleteMut = useDeleteEmployeeType();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeType | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...empty, sort_order: (types[types.length - 1]?.sort_order || 100) + 10 });
    setOpen(true);
  };

  const openEdit = (t: EmployeeType) => {
    setEditing(t);
    setForm({
      code: t.code,
      name: t.name,
      category: t.category,
      sort_order: t.sort_order,
      is_active: t.is_active,
      default_work_pattern_id: t.default_work_pattern_id ?? null,
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase() || form.name.trim().replace(/\s+/g, '_').toUpperCase().slice(0, 20),
      name: form.name.trim(),
    };
    if (editing) await updateMut.mutateAsync({ id: editing.id, ...payload });
    else await createMut.mutateAsync(payload);
    setOpen(false);
  };

  return (
    <MainLayout
      title="Employee Types"
      subtitle="Manage the list of employee types (Helper, Machinist, Supervisor…)"
      actions={
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Type
        </Button>
      }
    >
      <div className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle>Types ({types.length})</CardTitle>
            <CardDescription>
              Used in HR → Employees. Category controls operator-style vs office-style behaviour.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Default Work Pattern</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                    )}
                    {!isLoading && types.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No types yet</TableCell></TableRow>
                    )}
                    {types.map((t) => {
                      const pat = patterns.find((p) => p.id === t.default_work_pattern_id);
                      return (
                      <TableRow key={t.id}>
                        <TableCell>{t.sort_order}</TableCell>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell><code className="text-xs">{t.code}</code></TableCell>
                        <TableCell>
                          <Badge variant={t.category === 'factory' ? 'default' : 'secondary'}>
                            {t.category === 'factory' ? 'Factory' : 'Office'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{pat ? pat.name : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {t.is_active ? <Badge variant="outline">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete "${t.name}"? Employees using it will become un-typed.`)) {
                                deleteMut.mutate(t.id);
                              }
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );})}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Employee Type' : 'Add Employee Type'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Helper" />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="Auto from name (e.g. HELPER)"
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
              <div>
                <Label>Display order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((s) => ({ ...s, sort_order: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Default Work Pattern</Label>
                <Select
                  value={form.default_work_pattern_id || '__none__'}
                  onValueChange={(v) => setForm((s) => ({ ...s, default_work_pattern_id: v === '__none__' ? null : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {patterns.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((s) => ({ ...s, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}>
                {editing ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
