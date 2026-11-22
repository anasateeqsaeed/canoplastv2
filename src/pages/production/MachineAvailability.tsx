import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Cog, Search, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/dates';
import { useDepartments } from '@/hooks/useDepartments';
import { useJobEtas, useMachineAvailability, type MachineItem } from '@/hooks/useLineBoxes';
import { fmtN } from '@/components/sales/LineStatusBoxes';

const TYPE_LABEL: Record<string, string> = {
  injection: 'Injection',
  extrusion_blow: 'Extrusion blow',
  pet_blow: 'PET blow',
};

const STATUS_CLS: Record<string, string> = {
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  idle: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  stopped: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_UR: Record<string, string> = { running: 'چل رہی ہے', idle: 'فارغ', maintenance: 'مرمت', stopped: 'بند' };

/** A job still "in progress" with nothing left to make — someone forgot to close it. */
const needsClosing = (m: MachineItem) => !!m.current_job && m.current_remaining != null && Number(m.current_remaining) <= 0;

export default function MachineAvailability() {
  const { data: machines = [], isLoading } = useMachineAvailability();
  const { data: jobs = {} } = useJobEtas();
  const { data: departments = [] } = useDepartments();
  const [dept, setDept] = useState('all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');

  const deptName = useMemo(() => new Map((departments as any[]).map((d) => [d.id, d.name])), [departments]);
  const deptIds = useMemo(() => [...new Set(machines.map((m) => m.department_id).filter(Boolean))] as string[], [machines]);
  const types = useMemo(() => [...new Set(machines.map((m) => m.machine_type).filter(Boolean))].sort() as string[], [machines]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return machines
      .filter((m) => dept === 'all' || m.department_id === dept)
      .filter((m) => type === 'all' || m.machine_type === type)
      .filter((m) => !term || `${m.machine_code} ${m.current_job ?? ''} ${m.current_product ?? ''}`.toLowerCase().includes(term))
      .sort((a, b) => Number(!!b.free_now) - Number(!!a.free_now) || (a.free_from ?? '9999').localeCompare(b.free_from ?? '9999') || a.machine_code.localeCompare(b.machine_code));
  }, [machines, dept, type, q]);

  const counts = useMemo(() => ({
    freeNow: list.filter((m) => m.free_now).length,
    running: list.filter((m) => m.machine_status === 'running').length,
    maintenance: list.filter((m) => m.machine_status === 'maintenance' || m.maintenance_wo).length,
    toClose: list.filter(needsClosing).length,
  }), [list]);

  return (
    <MainLayout title="Machine Availability" subtitle="مشینوں کی دستیابی — soonest free first">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { en: 'Free now', ur: 'ابھی فارغ', n: counts.freeNow, cls: 'text-green-700 dark:text-green-400' },
            { en: 'Running', ur: 'چل رہی ہیں', n: counts.running, cls: 'text-blue-700 dark:text-blue-300' },
            { en: 'Maintenance', ur: 'مرمت', n: counts.maintenance, cls: 'text-amber-700 dark:text-amber-300' },
            { en: 'Jobs to close', ur: 'جاب بند کریں', n: counts.toClose, cls: 'text-red-600' },
          ].map((c) => (
            <div key={c.en} className="rounded-xl border bg-card p-3">
              <div className={cn('text-2xl font-bold tabular-nums', c.cls)}>{c.n}</div>
              <div className="text-sm text-muted-foreground">{c.en} <span dir="rtl" lang="ur">{c.ur}</span></div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Machine, job or product…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {deptIds.map((d) => <SelectItem key={d} value={d}>{deptName.get(d) ?? d.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All machine types</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t] ?? t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : list.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No machines match.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((m) => {
              const job = m.current_job ? jobs[m.current_job] : undefined;
              const close = needsClosing(m);
              return (
                <div key={m.machine_id} className={cn('rounded-lg border bg-card p-3 space-y-2', close && 'border-red-400', m.free_now && 'border-green-400')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Cog size={16} className="text-primary" />
                    <span className="font-mono font-semibold">{m.machine_code}</span>
                    <span className="text-xs text-muted-foreground">
                      {TYPE_LABEL[m.machine_type ?? ''] ?? m.machine_type}{m.tonnage ? ` · ${m.tonnage}T` : ''}
                      {m.department_id && deptName.get(m.department_id) ? ` · ${deptName.get(m.department_id)}` : ''}
                    </span>
                    <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_CLS[m.machine_status ?? ''] ?? 'bg-muted text-muted-foreground')}>
                      {m.machine_status ?? '—'} {STATUS_UR[m.machine_status ?? ''] && <span dir="rtl" lang="ur">{STATUS_UR[m.machine_status ?? '']}</span>}
                    </span>
                  </div>

                  <div className="text-sm">
                    Free {m.free_now ? <b className="text-green-700 dark:text-green-400">now</b> : <>from <b>{fmtDate(m.free_from)}</b></>}
                    <span dir="rtl" lang="ur" className="ml-2 text-muted-foreground">فارغ</span>
                  </div>

                  {m.current_job ? (
                    <div className="rounded bg-muted/40 p-2 text-sm space-y-1">
                      <div className="flex flex-wrap gap-x-2">
                        <span className="font-mono text-xs">{m.current_job}</span>
                        <span className="text-muted-foreground">{m.current_product}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><div className="text-muted-foreground">Remaining</div><b className="tabular-nums">{fmtN(m.current_remaining, 0)}</b></div>
                        <div><div className="text-muted-foreground">Rate/hr</div><b className="tabular-nums">{fmtN(m.current_rate, 0)}</b></div>
                        <div><div className="text-muted-foreground">ETA</div><b>{fmtDate(m.current_job_eta)}</b></div>
                      </div>
                      {job?.rate_source && <div className="text-[11px] text-muted-foreground">rate: {job.rate_source}{job.hours_left != null ? ` · ${fmtN(job.hours_left, 1)} h left` : ''}</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No job running</div>
                  )}

                  {close && (
                    <div className="flex items-start gap-1.5 rounded bg-red-50 dark:bg-red-950/30 p-2 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      <span>Remaining is 0 but the job is still in progress — <b>close this job</b>. <span dir="rtl" lang="ur">جاب بند کریں</span></span>
                    </div>
                  )}

                  {(m.queued_jobs ?? 0) > 0 && (
                    <div className="text-xs"><span className="text-muted-foreground">Queue ({m.queued_jobs}):</span> {m.queued_list}</div>
                  )}

                  {(m.maintenance_wo || m.stop_reason) && (
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <Wrench size={12} className="inline mr-1" />
                      {m.maintenance_wo ? <>WO {m.maintenance_wo} ({m.maintenance_status ?? '—'}){m.maintenance_till ? ` till ${fmtDate(m.maintenance_till)}` : ''}</> : null}
                      {m.stop_reason && <span className="ml-1">{m.stop_reason}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
