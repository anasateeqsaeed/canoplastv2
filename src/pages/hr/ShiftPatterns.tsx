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
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { RefreshButton } from '@/components/layout/RefreshButton';
import {
  useHrWorkPatterns,
  useCreateHrWorkPattern,
  useUpdateHrWorkPattern,
  useDeleteHrWorkPattern,
  HrWorkPattern,
  HrWorkPatternInput,
  formatPatternTime,
  patternDurationHours,
} from '@/hooks/useHrWorkPatterns';

const COLORS = ['slate', 'blue', 'emerald', 'amber', 'orange', 'purple', 'rose', 'indigo'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const empty: HrWorkPatternInput = {
  code: '',
  name: '',
  color: 'blue',
  start_hour: 9, start_minute: 0,
  end_hour: 17, end_minute: 30,
  grace_minutes: 15,
  lunch_minutes: 60,
  standard_hours: 8,
  ot_threshold_hours: 8,
  standard_days_per_month: 26,
  weekly_off_days: [5],
  is_active: true,
};

export default function ShiftPatterns() {
  const { data: patterns = [], isLoading } = useHrWorkPatterns({ includeInactive: true });
  const createMut = useCreateHrWorkPattern();
  const updateMut = useUpdateHrWorkPattern();
  const deleteMut = useDeleteHrWorkPattern();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HrWorkPattern | null>(null);
  const [form, setForm] = useState<HrWorkPatternInput>(empty);

  const set = <K extends keyof HrWorkPatternInput>(k: K, v: HrWorkPatternInput[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const setTime = (kind: 'start' | 'end', value: string) => {
    const [h, m] = value.split(':').map(Number);
    if (kind === 'start') { set('start_hour', h || 0); set('start_minute', m || 0); }
    else { set('end_hour', h || 0); set('end_minute', m || 0); }
  };

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: HrWorkPattern) => {
    setEditing(p);
    setForm({
      code: p.code, name: p.name, color: p.color,
      start_hour: p.start_hour, start_minute: p.start_minute,
      end_hour: p.end_hour, end_minute: p.end_minute,
      grace_minutes: p.grace_minutes, lunch_minutes: p.lunch_minutes,
      standard_hours: Number(p.standard_hours), ot_threshold_hours: Number(p.ot_threshold_hours),
      standard_days_per_month: p.standard_days_per_month,
      weekly_off_days: p.weekly_off_days, is_active: p.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (editing) await updateMut.mutateAsync({ id: editing.id, ...form });
    else await createMut.mutateAsync(form);
    setOpen(false);
  };

  const toggleOff = (d: number) => {
    const cur = form.weekly_off_days || [];
    set('weekly_off_days', cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort());
  };

  const tval = (h?: number, m?: number) => `${String(h ?? 0).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;

  return (
    <MainLayout
      title="HR Shift Patterns"
      subtitle="Independent work-timing patterns for HR & Payroll (separate from production shifts)."
      actions={
        <div className="flex items-center gap-2">
          <RefreshButton />
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Pattern</Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Work Patterns ({patterns.length})</CardTitle>
            <CardDescription>
              Assign these to employee types as defaults, or override per employee. Production data-entry shifts are managed separately under <strong>Settings → Shift Settings</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Time Range</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">OT after</TableHead>
                      <TableHead className="text-right">Grace</TableHead>
                      <TableHead className="text-right">Days/Mo</TableHead>
                      <TableHead>Off Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                    )}
                    {!isLoading && patterns.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No patterns yet</TableCell></TableRow>
                    )}
                    {patterns.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full bg-${p.color}-500`} />
                            {p.name}
                          </div>
                        </TableCell>
                        <TableCell><code className="text-xs">{p.code}</code></TableCell>
                        <TableCell>{formatPatternTime(p)} <span className="text-muted-foreground">({patternDurationHours(p)}h)</span></TableCell>
                        <TableCell className="text-right">{Number(p.standard_hours)}</TableCell>
                        <TableCell className="text-right">{Number(p.ot_threshold_hours)}h</TableCell>
                        <TableCell className="text-right">{p.grace_minutes}m</TableCell>
                        <TableCell className="text-right">{p.standard_days_per_month}</TableCell>
                        <TableCell className="text-xs">{(p.weekly_off_days || []).map((d) => DAYS[d]).join(', ') || '—'}</TableCell>
                        <TableCell>
                          {p.is_active
                            ? <Badge variant="outline">Active</Badge>
                            : <Badge variant="destructive">Inactive</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button
                            variant="ghost" size="icon" title="Delete"
                            onClick={() => { if (confirm(`Delete pattern "${p.name}"? Employees using it will fall back to office.`)) deleteMut.mutate(p.id); }}
                          ><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Work Pattern' : 'Add Work Pattern'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Office Staff" />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={form.code || ''} onChange={(e) => set('code', e.target.value)} placeholder="auto from name" />
              </div>
              <div>
                <Label>Color</Label>
                <Select value={form.color || 'slate'} onValueChange={(v) => set('color', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLORS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start time</Label>
                <Input type="time" step={60} value={tval(form.start_hour, form.start_minute)} onChange={(e) => setTime('start', e.target.value)} />
              </div>
              <div>
                <Label>End time</Label>
                <Input type="time" step={60} value={tval(form.end_hour, form.end_minute)} onChange={(e) => setTime('end', e.target.value)} />
              </div>
              <div>
                <Label>Standard hours/day</Label>
                <Input type="number" step="0.5" value={form.standard_hours ?? 8} onChange={(e) => set('standard_hours', Number(e.target.value))} />
              </div>
              <div>
                <Label>OT after (hours)</Label>
                <Input type="number" step="0.5" value={form.ot_threshold_hours ?? 8} onChange={(e) => set('ot_threshold_hours', Number(e.target.value))} />
              </div>
              <div>
                <Label>Grace (minutes)</Label>
                <Input type="number" value={form.grace_minutes ?? 15} onChange={(e) => set('grace_minutes', Number(e.target.value))} />
              </div>
              <div>
                <Label>Lunch (minutes)</Label>
                <Input type="number" value={form.lunch_minutes ?? 60} onChange={(e) => set('lunch_minutes', Number(e.target.value))} />
              </div>
              <div>
                <Label>Standard days / month</Label>
                <Input type="number" value={form.standard_days_per_month ?? 26} onChange={(e) => set('standard_days_per_month', Number(e.target.value))} />
              </div>
              <div className="flex items-end justify-between border rounded-md px-3 py-2">
                <Label>Active</Label>
                <Switch checked={!!form.is_active} onCheckedChange={(v) => set('is_active', v)} />
              </div>
              <div className="col-span-2">
                <Label>Weekly off days</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DAYS.map((d, i) => {
                    const on = (form.weekly_off_days || []).includes(i);
                    return (
                      <button
                        key={i} type="button" onClick={() => toggleOff(i)}
                        className={`px-3 py-1 rounded-md border text-xs ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                      >{d}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={!form.name?.trim() || createMut.isPending || updateMut.isPending}>
                {editing ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
