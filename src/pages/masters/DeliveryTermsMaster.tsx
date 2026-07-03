import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Save } from 'lucide-react';
import { useDeliveryTerms, useUpsertDeliveryTerm, type DeliveryTerm } from '@/hooks/useCostingMasters';

export default function DeliveryTermsMaster() {
  const { data: terms = [] } = useDeliveryTerms();
  const upsert = useUpsertDeliveryTerm();
  const [draft, setDraft] = useState<Partial<DeliveryTerm>>({ name: '', packing_cost_per_kg: 0, delivery_cost_per_kg: 0 });
  const [edits, setEdits] = useState<Record<string, Partial<DeliveryTerm>>>({});

  const setEdit = (id: string, patch: Partial<DeliveryTerm>) =>
    setEdits((p) => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));

  return (
    <MainLayout title="Delivery Terms" subtitle="Packing + delivery cost presets used in Price Calculator">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-56" placeholder="e.g. Lahore Door" />
            </div>
            <div>
              <Label className="text-xs">Packing Rs/kg</Label>
              <Input type="number" step="0.01" value={draft.packing_cost_per_kg ?? 0} onChange={(e) => setDraft({ ...draft, packing_cost_per_kg: +e.target.value })} className="w-32" />
            </div>
            <div>
              <Label className="text-xs">Delivery Rs/kg</Label>
              <Input type="number" step="0.01" value={draft.delivery_cost_per_kg ?? 0} onChange={(e) => setDraft({ ...draft, delivery_cost_per_kg: +e.target.value })} className="w-32" />
            </div>
            <Button onClick={() => { if (draft.name) { upsert.mutate(draft as any); setDraft({ name: '', packing_cost_per_kg: 0, delivery_cost_per_kg: 0 }); } }}>
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
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Packing Rs/kg</TableHead>
                    <TableHead className="text-right">Delivery Rs/kg</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((t) => {
                    const e = edits[t.id] || {};
                    return (
                      <TableRow key={t.id}>
                        <TableCell><Input value={e.name ?? t.name} onChange={(ev) => setEdit(t.id, { name: ev.target.value })} className="h-8" /></TableCell>
                        <TableCell className="text-right"><Input type="number" step="0.01" value={e.packing_cost_per_kg ?? t.packing_cost_per_kg} onChange={(ev) => setEdit(t.id, { packing_cost_per_kg: +ev.target.value })} className="h-8 text-right" /></TableCell>
                        <TableCell className="text-right"><Input type="number" step="0.01" value={e.delivery_cost_per_kg ?? t.delivery_cost_per_kg} onChange={(ev) => setEdit(t.id, { delivery_cost_per_kg: +ev.target.value })} className="h-8 text-right" /></TableCell>
                        <TableCell><Input value={e.notes ?? t.notes ?? ''} onChange={(ev) => setEdit(t.id, { notes: ev.target.value })} className="h-8" /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => upsert.mutate({ id: t.id, ...t, ...e } as any)}>
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
