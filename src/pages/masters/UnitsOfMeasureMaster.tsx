import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Save } from 'lucide-react';
import { useUnitsOfMeasure, useUpsertUnitOfMeasure, type UnitOfMeasure } from '@/hooks/useUnitsOfMeasure';

export default function UnitsOfMeasureMaster() {
  const { data: units = [] } = useUnitsOfMeasure();
  const upsert = useUpsertUnitOfMeasure();
  const [draft, setDraft] = useState<Partial<UnitOfMeasure>>({ code: '', name: '', description: '' });
  const [edits, setEdits] = useState<Record<string, Partial<UnitOfMeasure>>>({});

  const setEdit = (id: string, patch: Partial<UnitOfMeasure>) =>
    setEdits((p) => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));

  return (
    <MainLayout title="Units of Measure" subtitle="Measurement units used across masters and transactions">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Code</Label>
              <Input value={draft.code || ''} onChange={(e) => setDraft({ ...draft, code: e.target.value })} className="w-32" placeholder="e.g. KG" />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-56" placeholder="e.g. Kilogram" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="w-56" />
            </div>
            <Button onClick={() => { if (draft.code && draft.name) { upsert.mutate(draft as any); setDraft({ code: '', name: '', description: '' }); } }}>
              <Plus size={16} className="mr-2" /> Add
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => {
                    const e = edits[u.id] || {};
                    return (
                      <TableRow key={u.id}>
                        <TableCell><Input value={e.code ?? u.code} onChange={(ev) => setEdit(u.id, { code: ev.target.value })} className="h-8 w-24" /></TableCell>
                        <TableCell><Input value={e.name ?? u.name} onChange={(ev) => setEdit(u.id, { name: ev.target.value })} className="h-8" /></TableCell>
                        <TableCell><Input value={e.description ?? u.description ?? ''} onChange={(ev) => setEdit(u.id, { description: ev.target.value })} className="h-8" /></TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={(e.is_active ?? u.is_active) ?? false}
                            onCheckedChange={(v) => { setEdit(u.id, { is_active: v }); upsert.mutate({ id: u.id, code: e.code ?? u.code, name: e.name ?? u.name, is_active: v }); }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => upsert.mutate({ id: u.id, ...u, ...e } as any)}>
                            <Save size={14} className="mr-1" />Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
