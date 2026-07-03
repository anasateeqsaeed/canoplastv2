import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Save } from 'lucide-react';
import { usePaymentTerms, useUpsertPaymentTerm, type PaymentTerm } from '@/hooks/useCostingMasters';

export default function PaymentTermsMaster() {
  const { data: terms = [] } = usePaymentTerms();
  const upsert = useUpsertPaymentTerm();
  const [draft, setDraft] = useState<Partial<PaymentTerm>>({ name: '', price_adjust_pct: 0, sort_order: 0 });
  const [edits, setEdits] = useState<Record<string, Partial<PaymentTerm>>>({});

  const setEdit = (id: string, patch: Partial<PaymentTerm>) =>
    setEdits((p) => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));

  return (
    <MainLayout title="Payment Terms" subtitle="Price-adjustment presets (advance vs credit) used in Price Calculator">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-56" placeholder="e.g. 60-day Credit" />
            </div>
            <div>
              <Label className="text-xs">Price Adjust %</Label>
              <Input type="number" step="0.1" value={draft.price_adjust_pct ?? 0} onChange={(e) => setDraft({ ...draft, price_adjust_pct: +e.target.value })} className="w-32" />
            </div>
            <div>
              <Label className="text-xs">Order</Label>
              <Input type="number" value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: +e.target.value })} className="w-20" />
            </div>
            <Button onClick={() => { if (draft.name) { upsert.mutate(draft as any); setDraft({ name: '', price_adjust_pct: 0, sort_order: 0 }); } }}>
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
                    <TableHead>Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Price Adjust %</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((t) => {
                    const e = edits[t.id] || {};
                    return (
                      <TableRow key={t.id}>
                        <TableCell><Input type="number" value={e.sort_order ?? t.sort_order} onChange={(ev) => setEdit(t.id, { sort_order: +ev.target.value })} className="h-8 w-20" /></TableCell>
                        <TableCell><Input value={e.name ?? t.name} onChange={(ev) => setEdit(t.id, { name: ev.target.value })} className="h-8" /></TableCell>
                        <TableCell className="text-right"><Input type="number" step="0.1" value={e.price_adjust_pct ?? t.price_adjust_pct} onChange={(ev) => setEdit(t.id, { price_adjust_pct: +ev.target.value })} className="h-8 text-right w-24" /></TableCell>
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
