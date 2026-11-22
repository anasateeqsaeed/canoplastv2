import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReadinessWeights, useUpdateReadinessWeights, type ReadinessWeight } from '@/hooks/useOrderReadiness';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';
import { fmtDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

const PHASES: Array<{ key: ReadinessWeight['phase']; en: string; ur: string; hint: string }> = [
  { key: 'order', en: 'Order', ur: 'آرڈر', hint: 'Steps 1–8: mold → dispatch (incl. 5 Fitting parts). Active weights should add up to 100.' },
  { key: 'closure', en: 'Closure', ur: 'وصولی', hint: 'Steps 9–13: invoice → payment. Active weights should add up to 100.' },
  { key: 'phase', en: 'Phase split', ur: 'حصوں کی تقسیم', hint: 'How the grand Total % is split between Order and Closure. Should add up to 100.' },
];

type Draft = Record<string, { weight: string; is_active: boolean }>;

export default function ReadinessWeights() {
  const { roles } = useAuth();
  const canEdit = roles.includes('admin') || roles.includes('super_user');
  const { data: rows = [], isLoading } = useReadinessWeights();
  const save = useUpdateReadinessWeights();
  const [draft, setDraft] = useState<Draft>({});
  useRealtimeInvalidate(['so_readiness_weights'], [['readiness-weights']]);

  const reset = () =>
    setDraft(Object.fromEntries(rows.map((r) => [r.step_key, { weight: String(r.weight), is_active: r.is_active }])));
  useEffect(reset, [rows]);

  const dirty = useMemo(
    () => rows.filter((r) => draft[r.step_key] && (Number(draft[r.step_key].weight) !== r.weight || draft[r.step_key].is_active !== r.is_active)),
    [rows, draft],
  );
  const invalid =
    Object.values(draft).some((d) => d.weight === '' || Number.isNaN(Number(d.weight)) || Number(d.weight) < 0) ||
    (draft.hours_per_day != null && (Number(draft.hours_per_day.weight) <= 0 || Number(draft.hours_per_day.weight) > 24));

  const onSave = () => {
    save.mutate(dirty.map((r) => ({ step_key: r.step_key, weight: Number(draft[r.step_key].weight), is_active: draft[r.step_key].is_active })));
  };

  return (
    <MainLayout title="Order Readiness Weights" subtitle="آرڈر کی تیاری — وزن">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Each step's weight decides how much it counts toward its phase %. Totals that are not 100 are only a warning — the views normalise by the active total.
          </p>
          {canEdit && (
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} disabled={!dirty.length || save.isPending}>
                <RotateCcw size={14} className="mr-1" /> Reset
              </Button>
              <Button size="sm" onClick={onSave} disabled={!dirty.length || invalid || save.isPending}>
                <Save size={14} className="mr-1" /> Save {dirty.length ? `(${dirty.length})` : ''}
              </Button>
            </div>
          )}
        </div>
        {!canEdit && <p className="text-xs text-muted-foreground">Read-only — only admin / super user can change weights.</p>}

        {isLoading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : (
          PHASES.map((ph) => {
            const list = rows.filter((r) => r.phase === ph.key);
            if (!list.length) return null;
            const total = list.reduce((s, r) => {
              const d = draft[r.step_key];
              return s + (d?.is_active ?? r.is_active ? Number(d?.weight ?? r.weight) || 0 : 0);
            }, 0);
            const ok = Math.abs(total - 100) < 0.001;
            return (
              <Card key={ph.key}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-base">
                      {ph.en} <span dir="rtl" lang="ur" className="font-normal text-muted-foreground">{ph.ur}</span>
                    </CardTitle>
                    <span
                      className={cn(
                        'ml-auto inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium',
                        ok ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
                      )}
                    >
                      {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      Active total {total} / 100
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ph.hint}</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Step</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead className="w-28 text-right">Weight</TableHead>
                          <TableHead className="w-20 text-center">Active</TableHead>
                          <TableHead className="w-28">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((r) => {
                          const d = draft[r.step_key] ?? { weight: String(r.weight), is_active: r.is_active };
                          return (
                            <TableRow key={r.step_key} className={cn(!d.is_active && 'opacity-60')}>
                              <TableCell className="text-muted-foreground">{r.step_no || '—'}</TableCell>
                              <TableCell>
                                <div className="font-medium">{r.label}</div>
                                {r.label_ur && <div dir="rtl" lang="ur" className="text-sm text-muted-foreground text-left">{r.label_ur}</div>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-xs">{r.note || '—'}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  step="1"
                                  inputMode="decimal"
                                  className="h-9 w-24 ml-auto text-right"
                                  value={d.weight}
                                  disabled={!canEdit}
                                  onChange={(e) => setDraft((p) => ({ ...p, [r.step_key]: { ...d, weight: e.target.value } }))}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={d.is_active}
                                  disabled={!canEdit}
                                  onCheckedChange={(v) => setDraft((p) => ({ ...p, [r.step_key]: { ...d, is_active: v } }))}
                                />
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{fmtDate(r.updated_at)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Settings rows (phase = 'setting'), e.g. hours_per_day used for every ETA */}
        {rows.filter((r) => r.phase === 'setting').length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Planning settings <span dir="rtl" lang="ur" className="font-normal text-muted-foreground">منصوبہ بندی کی ترتیبات</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Used for every production ETA (machine, mold and order line status boxes).</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.filter((r) => r.phase === 'setting').map((r) => {
                const d = draft[r.step_key] ?? { weight: String(r.weight), is_active: r.is_active };
                const isHours = r.step_key === 'hours_per_day';
                const bad = isHours && (Number(d.weight) <= 0 || Number(d.weight) > 24);
                return (
                  <div key={r.step_key} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{r.label}</div>
                      {r.label_ur && <div dir="rtl" lang="ur" className="text-sm text-muted-foreground text-left">{r.label_ur}</div>}
                      {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={isHours ? 24 : undefined}
                        step="0.5"
                        inputMode="decimal"
                        className={cn('h-9 w-24 text-right', bad && 'border-red-500')}
                        value={d.weight}
                        disabled={!canEdit}
                        onChange={(e) => setDraft((p) => ({ ...p, [r.step_key]: { ...d, weight: e.target.value } }))}
                      />
                      {isHours && <span className="text-sm text-muted-foreground">h / day</span>}
                    </div>
                    {bad && <p className="w-full text-xs text-red-600">Hours per day must be between 1 and 24.</p>}
                    <p className="w-full text-[11px] text-muted-foreground">Updated {fmtDate(r.updated_at)}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
