import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SearchableComboBox } from '@/components/ui/searchable-combobox';
import {
  AlertTriangle, CalendarClock, ChevronDown, Cog, Factory, Layers, Loader2, Package, Palette, Puzzle, ShoppingCart, Star, Truck, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/dates';
import { useProducts } from '@/hooks/useProducts';
import {
  BOX_ORDER, useLineBoxes, useLineMaterialIds, useSetLineProduct,
  type Box, type BoxKey, type BoxStatus, type DispatchBox, type LineBoxes, type MachineItem, type MaterialBox, type MoldBox, type ProductionBox,
} from '@/hooks/useLineBoxes';

// ---------- formatting ----------
export const fmtN = (n: number | null | undefined, digits = 2) =>
  n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });

export const STATUS_CHIP: Record<BoxStatus, { en: string; ur: string; cls: string }> = {
  ok: { en: 'OK', ur: 'ٹھیک', cls: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' },
  busy: { en: 'Busy', ur: 'مصروف', cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800' },
  partial: { en: 'Partial', ur: 'جزوی', cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800' },
  ordered: { en: 'Ordered', ur: 'آرڈر ہو گیا', cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800' },
  running: { en: 'Running', ur: 'چل رہا ہے', cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800' },
  short: { en: 'Short', ur: 'کمی', cls: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800' },
  blocked: { en: 'Blocked', ur: 'رکاوٹ', cls: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800' },
  not_set: { en: 'Setup missing', ur: 'سیٹ نہیں', cls: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800' },
  na: { en: 'N/A', ur: 'لاگو نہیں', cls: 'bg-muted text-muted-foreground border-border' },
  pending: { en: 'Pending', ur: 'باقی', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
};

export function StatusChip({ status, className }: { status: BoxStatus | string; className?: string }) {
  const m = STATUS_CHIP[status as BoxStatus] ?? STATUS_CHIP.pending;
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium', m.cls, className)}>
      {m.en} <span dir="rtl" lang="ur">{m.ur}</span>
    </span>
  );
}

const ICONS: Record<BoxKey, React.ReactNode> = {
  mold: <Layers size={16} />,
  machine: <Cog size={16} />,
  raw_material: <Package size={16} />,
  pigment: <Palette size={16} />,
  components: <Puzzle size={16} />,
  packing: <Package size={16} />,
  production: <Factory size={16} />,
  dispatch: <Truck size={16} />,
};

function Ur({ children }: { children: React.ReactNode }) {
  return <span dir="rtl" lang="ur" className="text-muted-foreground font-normal">{children}</span>;
}

function KV({ k, v, className }: { k: React.ReactNode; v: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className="text-sm font-medium break-words">{v ?? '—'}</div>
    </div>
  );
}

function OnTimeChip({ finish, required, onTime }: { finish: string | null | undefined; required: string | null | undefined; onTime?: boolean | null }) {
  const ok = onTime ?? (finish && required ? finish <= required : null);
  if (ok == null) return null;
  return ok ? (
    <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-300">
      On time <span dir="rtl" lang="ur">وقت پر</span>
    </span>
  ) : (
    <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300">
      Late <span dir="rtl" lang="ur">دیر</span>
    </span>
  );
}

// ---------- detail renderers ----------
function MoldDetail({ box }: { box: MoldBox }) {
  if (!box.items?.length) return <p className="text-sm text-muted-foreground">No mold linked to this product.</p>;
  return (
    <div className="space-y-3">
      {box.items.map((m) => (
        <div key={m.mold_id} className="rounded-md border p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold">{m.mold_number}</span>
            <span className="text-xs text-muted-foreground">{m.mold_status}{m.ownership ? ` · ${m.ownership}` : ''}</span>
            {m.free_from && <span className="ml-auto text-xs">Free from <b>{fmtDate(m.free_from)}</b></span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KV k="Cavities" v={fmtN(m.cavities, 0)} />
            <KV k="Location" v={m.location || '—'} />
            <KV k="Shots" v={m.shot_life ? `${fmtN(m.current_shots, 0)} / ${fmtN(m.shot_life, 0)}` : fmtN(m.current_shots, 0)} />
            <KV k="Status" v={m.mold_status} />
          </div>
          {m.maintenance_wo && (
            <div className="rounded bg-amber-50 dark:bg-amber-950/30 p-2 text-sm">
              <Wrench size={13} className="inline mr-1" />
              Maintenance <b>{m.maintenance_wo}</b> ({m.maintenance_status ?? '—'}) till {fmtDate(m.maintenance_till)}
              {m.problem_description && <div className="text-xs text-muted-foreground mt-0.5">{m.problem_description}</div>}
            </div>
          )}
          {m.running_job && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded bg-blue-50 dark:bg-blue-950/30 p-2">
              <KV k="Running job" v={<span className="font-mono">{m.running_job}</span>} />
              <KV k="Product" v={m.running_product} />
              <KV k="Machine" v={m.running_on_machine} />
              <KV k="Remaining · ETA" v={`${fmtN(m.running_remaining, 0)} · ${fmtDate(m.running_job_eta)}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MachineDetail({ items }: { items: MachineItem[] }) {
  const sorted = useMemo(
    () => [...(items || [])].sort((a, b) => (a.free_from ?? '9999').localeCompare(b.free_from ?? '9999') || (b.times_used ?? 0) - (a.times_used ?? 0)),
    [items],
  );
  if (!sorted.length) return <p className="text-sm text-muted-foreground">This mold hasn't run on any machine yet (no job history).</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Machines this mold has run on, soonest free first.</p>
      {/* phone: cards */}
      <div className="space-y-2 md:hidden">
        {sorted.map((m, i) => (
          <div key={m.machine_id} className={cn('rounded-md border p-2.5 space-y-1.5 text-sm', i === 0 && 'border-green-500 bg-green-50/60 dark:bg-green-950/20')}>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">{m.machine_code}</span>
              {i === 0 && <span className="inline-flex items-center gap-0.5 rounded bg-green-600 px-1.5 text-[10px] text-white"><Star size={10} /> Best option</span>}
              <span className="ml-auto text-xs">free {m.free_now ? 'now' : fmtDate(m.free_from)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {m.machine_status}{m.current_job ? ` · ${m.current_job} (${m.current_product ?? '—'})` : ''}
            </div>
            <div className="text-xs">
              rem {fmtN(m.current_remaining, 0)} · {fmtN(m.current_rate, 0)}/hr · ETA {fmtDate(m.current_job_eta)} · queue {m.queued_jobs ?? 0}
              {m.used_before ? ` · used ${m.times_used}× before` : ''}
            </div>
          </div>
        ))}
      </div>
      {/* desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-1.5 pr-2 text-left font-medium">Machine</th>
              <th className="py-1.5 pr-2 text-left font-medium">Status</th>
              <th className="py-1.5 pr-2 text-left font-medium">Current job · product</th>
              <th className="py-1.5 pr-2 text-right font-medium">Remaining</th>
              <th className="py-1.5 pr-2 text-right font-medium">Rate/hr</th>
              <th className="py-1.5 pr-2 text-left font-medium">Job ETA</th>
              <th className="py-1.5 pr-2 text-right font-medium">Queue</th>
              <th className="py-1.5 pr-2 text-left font-medium">Free from</th>
              <th className="py-1.5 text-left font-medium">History</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => (
              <tr key={m.machine_id} className={cn('border-b last:border-0 align-top', i === 0 && 'bg-green-50 dark:bg-green-950/30')}>
                <td className="py-1.5 pr-2">
                  <div className="font-mono font-medium">{m.machine_code}</div>
                  {i === 0 && <span className="inline-flex items-center gap-0.5 rounded bg-green-600 px-1.5 text-[10px] text-white"><Star size={10} /> Best option</span>}
                </td>
                <td className="py-1.5 pr-2">
                  {m.machine_status}
                  {m.maintenance_wo && <div className="text-[11px] text-amber-700">WO {m.maintenance_wo}{m.maintenance_till ? ` till ${fmtDate(m.maintenance_till)}` : ''}</div>}
                  {m.stop_reason && <div className="text-[11px] text-muted-foreground">{m.stop_reason}</div>}
                </td>
                <td className="py-1.5 pr-2">{m.current_job ? <><span className="font-mono text-xs">{m.current_job}</span><div className="text-xs text-muted-foreground">{m.current_product}</div></> : '—'}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{fmtN(m.current_remaining, 0)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{fmtN(m.current_rate, 0)}</td>
                <td className="py-1.5 pr-2">{fmtDate(m.current_job_eta)}</td>
                <td className="py-1.5 pr-2 text-right" title={m.queued_list ?? undefined}>{m.queued_jobs ?? 0}</td>
                <td className="py-1.5 pr-2 font-medium">{m.free_now ? 'Now' : fmtDate(m.free_from)}</td>
                <td className="py-1.5 text-xs text-muted-foreground">
                  {m.used_before ? `Used ${m.times_used}× before` : 'Never used'}
                  {m.last_used && <div>last {fmtDate(m.last_used)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaterialDetail({ box, materialIds, soNumber }: { box: MaterialBox; materialIds: Record<string, string>; soNumber: string }) {
  if (!box.items?.length) return <p className="text-sm text-muted-foreground">{box.summary || 'Nothing listed.'}</p>;
  const canPO = box.key !== 'components';
  const poLink = (name: string, qty: number) => {
    const id = materialIds[name.toLowerCase()];
    const p = new URLSearchParams({ new: '1', qty: String(Math.ceil(qty * 1000) / 1000), note: `${soNumber}: ${name}` });
    if (id) p.set('material', id);
    return `/purchase/orders?${p.toString()}`;
  };
  return (
    <div className="space-y-2">
      {box.items.map((it, i) => {
        const short = Number(it.shortfall) > 0;
        return (
          <div key={`${it.name}-${i}`} className={cn('rounded-md border p-2.5 space-y-2', short && 'border-red-300 dark:border-red-900')}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{it.name}</span>
              {it.note && <span className={cn('text-xs', short ? 'text-red-600' : 'text-muted-foreground')}>{it.note}</span>}
              {canPO && short && !it.po_numbers && (
                <Button asChild size="sm" variant="outline" className="ml-auto h-7 border-red-300 text-red-700 hover:text-red-800">
                  <Link to={poLink(it.name, Number(it.shortfall))}><ShoppingCart size={13} className="mr-1" /> Create PO</Link>
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <KV k={<>Required <Ur>ضرورت</Ur></>} v={`${fmtN(it.required)} ${it.unit ?? ''}`} />
              <KV k={<>In stock <Ur>اسٹاک</Ur></>} v={fmtN(it.in_stock)} />
              <KV k={<>Older orders <Ur>پرانے آرڈر</Ur></>} v={fmtN(it.reserved_by_older_orders)} />
              <KV k={<>Free for this <Ur>اس کے لیے</Ur></>} v={fmtN(it.free_for_this)} />
              <KV k={<>Shortfall <Ur>کمی</Ur></>} v={<span className={short ? 'text-red-600' : ''}>{fmtN(it.shortfall)}</span>} />
            </div>
            {(it.po_numbers || it.incoming_qty) && (
              <div className="rounded bg-blue-50 dark:bg-blue-950/30 px-2 py-1 text-xs">
                PO {it.po_numbers ?? '—'} · incoming {fmtN(it.incoming_qty)} {it.unit ?? ''} · expected {fmtDate(it.expected_date)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductionDetail({ box }: { box: ProductionBox }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KV k={<>To make <Ur>بنانا ہے</Ur></>} v={`${fmtN(box.to_make, 0)} pcs`} />
        <KV k={<>Speed <Ur>رفتار</Ur></>} v={<>{fmtN(box.rate_per_hour, 0)}/hr{box.rate_source && <div className="text-[11px] font-normal text-muted-foreground">{box.rate_source}</div>}</>} />
        <KV k={<>Days needed <Ur>دن</Ur></>} v={<>{fmtN(box.days_needed, 1)}{box.hours_per_day ? <span className="text-[11px] font-normal text-muted-foreground"> @ {box.hours_per_day} h/day</span> : null}</>} />
        <KV k={<>Earliest start <Ur>شروع</Ur></>} v={fmtDate(box.earliest_start)} />
        <KV k={<>Expected finish <Ur>ختم</Ur></>} v={fmtDate(box.expected_finish)} />
      </div>
      {!!box.blocked_by?.length && (
        <div className="flex flex-wrap gap-1.5">
          {box.blocked_by.map((b) => (
            <span key={b} className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300">
              <AlertTriangle size={11} className="inline mr-1" />{b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DispatchDetail({ box, data }: { box: DispatchBox; data: LineBoxes }) {
  const l = data.line;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <KV k={<>Dispatched <Ur>روانہ</Ur></>} v={fmtN(l.dispatched_qty, 0)} />
        <KV k={<>DC draft <Ur>ڈرافٹ</Ur></>} v={fmtN(l.in_dispatch_qty, 0)} />
        <KV k={<>Ready <Ur>تیار</Ur></>} v={fmtN(l.ready_qty, 0)} />
        <KV k={<>Required <Ur>مطلوبہ</Ur></>} v={fmtDate(box.required_date)} />
        <KV k={<>Days left <Ur>دن باقی</Ur></>} v={box.days_left == null ? '—' : <span className={box.days_left < 0 ? 'text-red-600' : ''}>{box.days_left}</span>} />
        <KV k="Expected finish" v={fmtDate(data.plan?.expected_finish)} />
      </div>
      <OnTimeChip finish={data.plan?.expected_finish} required={box.required_date} onTime={box.on_time} />
    </div>
  );
}

function BoxCard({ box, data, materialIds }: { box: Box; data: LineBoxes; materialIds: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('rounded-lg border bg-card transition-shadow', open && 'md:col-span-2 xl:col-span-3 shadow-sm', box.status === 'na' && 'opacity-60')}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 p-3 text-left" aria-expanded={open}>
        <span className="mt-0.5 text-primary">{ICONS[box.key]}</span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{box.title}</span>
            {box.title_ur && <Ur>{box.title_ur}</Ur>}
            <StatusChip status={box.status} className="ml-auto" />
          </div>
          {box.summary && <p className="text-sm text-muted-foreground break-words">{box.summary}</p>}
          {box.available_from && (
            <p className="text-xs">
              <CalendarClock size={12} className="inline mr-1" />
              Available from <b>{fmtDate(box.available_from)}</b> <Ur>دستیاب</Ur>
            </p>
          )}
        </div>
        <ChevronDown size={16} className={cn('mt-1 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t p-3">
          {box.key === 'mold' && <MoldDetail box={box as MoldBox} />}
          {box.key === 'machine' && <MachineDetail items={(box as any).items ?? []} />}
          {(box.key === 'raw_material' || box.key === 'pigment' || box.key === 'packing' || box.key === 'components') && (
            <MaterialDetail box={box as MaterialBox} materialIds={materialIds} soNumber={data.line.so_number} />
          )}
          {box.key === 'production' && <ProductionDetail box={box as ProductionBox} />}
          {box.key === 'dispatch' && <DispatchDetail box={box as DispatchBox} data={data} />}
        </div>
      )}
    </div>
  );
}

function PlanSentence({ data }: { data: LineBoxes }) {
  const p = data.plan;
  const prod = data.boxes?.find((b) => b.key === 'production') as ProductionBox | undefined;
  if (!p) return null;
  const head = `${fmtN(p.to_make, 0)} pcs · ${fmtN(p.rate_per_hour, 0)}/hr · ${fmtN(p.days_needed, 1)} day${Number(p.days_needed) === 1 ? '' : 's'}`;
  if (!p.earliest_start) {
    const why = prod?.blocked_by?.length ? prod.blocked_by.join(', ') : 'the plan is incomplete';
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/30">
        <span className="font-medium">{head}</span>
        <div className="text-amber-800 dark:text-amber-200">
          Start date can't be given until: <b>{why}</b> <Ur>شروع کی تاریخ ابھی نہیں</Ur>
        </div>
      </div>
    );
  }
  const late = p.required_date && p.expected_finish ? p.expected_finish > p.required_date : null;
  return (
    <div className={cn('rounded-md border px-3 py-2 text-sm', late ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'bg-muted/40')}>
      <span className="font-medium">{head}</span> · start <b>{fmtDate(p.earliest_start)}</b> → finish <b>{fmtDate(p.expected_finish)}</b>{' '}
      {p.required_date ? (
        <span className={late ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-400'}>
          (required {fmtDate(p.required_date)} {late ? '⚠' : '✅'})
        </span>
      ) : (
        <span className="text-muted-foreground">(no required date)</span>
      )}
    </div>
  );
}

function MissingProduct({ data }: { data: LineBoxes }) {
  const { data: products = [] } = useProducts();
  const setProduct = useSetLineProduct();
  const [pid, setPid] = useState('');
  const options = useMemo(
    () => products.filter((p) => p.is_active !== false).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
    [products],
  );
  return (
    <div className="space-y-3 rounded-md border border-orange-300 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30">
      <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
        <AlertTriangle size={14} className="inline mr-1" />
        {data.error}
      </p>
      <p className="text-xs text-muted-foreground">Line text: “{data.line.product_name ?? '—'}”. Pick the product for this order line:</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <SearchableComboBox value={pid} onChange={setPid} options={options} placeholder="Choose product…" searchPlaceholder="Search code / name…" emptyMessage="No product" />
        </div>
        <Button
          type="button"
          disabled={!pid || setProduct.isPending}
          onClick={() => setProduct.mutate({ soiId: data.line.sales_order_item_id, productId: pid })}
        >
          {setProduct.isPending && <Loader2 size={14} className="mr-1 animate-spin" />} Save to order line
        </Button>
      </div>
    </div>
  );
}

/** Status Boxes for one sales order line (get_so_line_boxes). */
export function LineStatusBoxes({ soiId }: { soiId: string }) {
  const { data, isLoading, error } = useLineBoxes(soiId);
  const { data: materialIds = {} } = useLineMaterialIds(data?.line?.product_id);

  if (isLoading) return <div className="p-6 text-center text-muted-foreground"><Loader2 className="inline mr-2 animate-spin" size={16} />Loading…</div>;
  if (error) return <div className="p-4 text-sm text-red-600">Could not load: {(error as any).message}</div>;
  if (!data) return null;
  if (data.error) return <MissingProduct data={data} />;

  const boxes = [...(data.boxes ?? [])]
    .filter((b) => !(b.key === 'components' && b.status === 'na'))
    .sort((a, b) => BOX_ORDER.indexOf(a.key) - BOX_ORDER.indexOf(b.key));

  return (
    <div className="space-y-3">
      <PlanSentence data={data} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {boxes.map((b) => <BoxCard key={b.key} box={b} data={data} materialIds={materialIds} />)}
      </div>
    </div>
  );
}
