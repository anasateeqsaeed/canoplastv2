import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtDate, todayISO } from '@/lib/dates';
import { useMoldAvailability, type MoldAvailability as Mold } from '@/hooks/useLineBoxes';
import { fmtN } from '@/components/sales/LineStatusBoxes';

type Filter = 'all' | 'free' | 'running' | 'maintenance' | 'retired';

function stateOf(m: Mold): Exclude<Filter, 'all'> {
  if (m.mold_status === 'retired') return 'retired';
  if (m.maintenance_wo || m.mold_status === 'maintenance') return 'maintenance';
  if (m.running_job) return 'running';
  return 'free';
}

const STATE_META: Record<Exclude<Filter, 'all'>, { en: string; ur: string; cls: string }> = {
  free: { en: 'Free now', ur: 'ابھی فارغ', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  running: { en: 'Running', ur: 'چل رہا ہے', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  maintenance: { en: 'Maintenance', ur: 'مرمت', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  retired: { en: 'Retired', ur: 'ریٹائرڈ', cls: 'bg-muted text-muted-foreground' },
};

function StateChip({ m }: { m: Mold }) {
  const s = STATE_META[stateOf(m)];
  return <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', s.cls)}>{s.en} <span dir="rtl" lang="ur">{s.ur}</span></span>;
}

export default function MoldAvailability() {
  const { data: molds = [], isLoading } = useMoldAvailability();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const today = todayISO();

  const counts = useMemo(() => {
    const c: Record<Exclude<Filter, 'all'>, number> = { free: 0, running: 0, maintenance: 0, retired: 0 };
    molds.forEach((m) => { c[stateOf(m)]++; });
    return c;
  }, [molds]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return molds
      .filter((m) => filter === 'all' || stateOf(m) === filter)
      .filter((m) => !term || `${m.mold_number} ${m.running_product ?? ''} ${m.running_on_machine ?? ''} ${m.location ?? ''}`.toLowerCase().includes(term))
      .sort((a, b) => (a.free_from ?? '9999').localeCompare(b.free_from ?? '9999') || a.mold_number.localeCompare(b.mold_number));
  }, [molds, filter, q]);

  return (
    <MainLayout title="Mold Availability" subtitle="مولڈ کی دستیابی">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'free', 'running', 'maintenance', 'retired'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn('rounded-full border px-3 py-1.5 text-sm', filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted')}
            >
              {f === 'all' ? `All (${molds.length})` : `${STATE_META[f].en} (${counts[f]})`}
              {f !== 'all' && <span dir="rtl" lang="ur" className="ml-1 opacity-80">{STATE_META[f].ur}</span>}
            </button>
          ))}
        </div>
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Mold no., product, machine, location…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : (
          <>
            {/* phone */}
            <div className="space-y-2 md:hidden">
              {list.map((m) => (
                <div key={m.mold_id} className="rounded-lg border bg-card p-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{m.mold_number}</span>
                    <StateChip m={m} />
                    <span className="ml-auto text-xs">free {m.free_from && m.free_from > today ? fmtDate(m.free_from) : 'now'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtN(m.cavities, 0)} cav · {m.location || 'no location'} · {m.ownership ?? ''}</div>
                  {m.running_job && <div className="text-xs">{m.running_job} · {m.running_product} on {m.running_on_machine} · rem {fmtN(m.running_remaining, 0)} · ETA {fmtDate(m.running_job_eta)}</div>}
                  {m.maintenance_wo && <div className="text-xs text-amber-700"><Wrench size={11} className="inline mr-1" />{m.maintenance_wo} till {fmtDate(m.maintenance_till)} {m.problem_description && `— ${m.problem_description}`}</div>}
                </div>
              ))}
              {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No molds match.</p>}
            </div>
            {/* desktop */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[960px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mold</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-right">Cav.</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Running job · product · machine</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead>Job ETA</TableHead>
                        <TableHead>Maintenance</TableHead>
                        <TableHead>Free from</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((m) => (
                        <TableRow key={m.mold_id}>
                          <TableCell>
                            <div className="font-mono font-medium">{m.mold_number}</div>
                            <div className="text-[11px] text-muted-foreground">{m.ownership}{m.shot_life ? ` · ${fmtN(m.current_shots, 0)}/${fmtN(m.shot_life, 0)} shots` : ''}</div>
                          </TableCell>
                          <TableCell><StateChip m={m} /></TableCell>
                          <TableCell className="text-right tabular-nums">{fmtN(m.cavities, 0)}</TableCell>
                          <TableCell className="text-xs">{m.location || '—'}</TableCell>
                          <TableCell className="text-xs">
                            {m.running_job ? <><span className="font-mono">{m.running_job}</span><div className="text-muted-foreground">{m.running_product} · {m.running_on_machine}</div></> : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmtN(m.running_remaining, 0)}</TableCell>
                          <TableCell>{fmtDate(m.running_job_eta)}</TableCell>
                          <TableCell className="text-xs">
                            {m.maintenance_wo ? <><div>{m.maintenance_wo} ({m.maintenance_status ?? '—'}) till {fmtDate(m.maintenance_till)}</div>{m.problem_description && <div className="text-muted-foreground">{m.problem_description}</div>}</> : '—'}
                          </TableCell>
                          <TableCell className="font-medium">{m.free_from && m.free_from > today ? fmtDate(m.free_from) : stateOf(m) === 'retired' ? '—' : 'Now'}</TableCell>
                        </TableRow>
                      ))}
                      {list.length === 0 && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">No molds match.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
