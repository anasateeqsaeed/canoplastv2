import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Check, CircleDashed, Loader2, OctagonAlert, CircleHelp, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/dates';
import {
  useClosureSteps,
  useOrderClosureLinks,
  useReadinessSteps,
  type ClosureDC,
  type OrderReadinessSummary,
  type ReadinessStep,
  type StepStatus,
} from '@/hooks/useOrderReadiness';
import { useSoLineNeeds, type SoComponentNeed, type SoMaterialNeed } from '@/hooks/useBom';

const STATUS_META: Record<StepStatus, { en: string; ur: string; dot: string; text: string; icon: React.ReactNode }> = {
  done: { en: 'Done', ur: 'مکمل', dot: 'bg-green-600 text-white border-green-600', text: 'text-green-700 dark:text-green-400', icon: <Check size={14} /> },
  partial: { en: 'Partial', ur: 'جزوی', dot: 'bg-amber-500 text-white border-amber-500', text: 'text-amber-700 dark:text-amber-400', icon: <Loader2 size={14} /> },
  pending: { en: 'Pending', ur: 'باقی', dot: 'bg-background text-muted-foreground border-muted-foreground/40', text: 'text-muted-foreground', icon: <CircleDashed size={14} /> },
  blocked: { en: 'Blocked', ur: 'رکاوٹ', dot: 'bg-red-600 text-white border-red-600', text: 'text-red-700 dark:text-red-400', icon: <OctagonAlert size={14} /> },
  not_set: { en: 'Not set', ur: 'سیٹ نہیں', dot: 'bg-background text-amber-600 border-amber-500 border-dashed', text: 'text-amber-700 dark:text-amber-400', icon: <CircleHelp size={14} /> },
  na: { en: 'N/A', ur: 'لاگو نہیں', dot: 'bg-muted text-muted-foreground border-muted', text: 'text-muted-foreground', icon: <span className="text-[10px]">—</span> },
};

interface StepLink { to: string; label: string; external?: boolean }

/** Where each order step gets fixed. Modules not built yet still point at their future home. */
function orderStepLinks(step: ReadinessStep, productId: string | null): StepLink[] {
  const bom: StepLink[] = productId ? [{ to: `/masters/products?bom=${productId}`, label: 'BOM' }] : [];
  switch (step.step_key) {
    case 'mold': return [{ to: '/tooling', label: 'Tooling' }];
    case 'machine': return [{ to: '/production', label: 'Production plan' }];
    case 'raw_material': return [{ to: '/purchase/orders', label: 'Purchase' }, { to: '/inventory/raw-materials', label: 'RM stock' }, ...bom];
    case 'pigment': return [{ to: '/purchase/orders', label: 'Purchase' }, { to: '/mixing', label: 'Mixing' }, ...bom];
    case 'components': return [{ to: '/inventory/fg-stock', label: 'Parts stock' }, { to: '/production', label: 'Production' }, ...bom];
    case 'packing': return [{ to: '/purchase/orders', label: 'Purchase' }, ...bom];
    case 'production': return [{ to: '/production', label: 'Production' }];
    case 'dispatch': return [{ to: '/inventory/dispatch', label: 'Dispatch' }];
    default: return [];
  }
}

const fmtNum = (n: number) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Material / part rows behind a step (from v_so_raw_material / v_so_component_need). */
function NeedsList({ materials, components }: { materials: SoMaterialNeed[]; components: SoComponentNeed[] }) {
  const n = materials.length + components.length;
  if (!n) return null;
  const short = materials.filter((m) => Number(m.shortfall) > 0).length + components.filter((c) => Number(c.shortfall) > 0).length;
  return (
    <details className="mt-1.5 group">
      <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
        {components.length ? 'Parts' : 'Materials'} ({n}){short ? <span className="text-red-600"> · {short} short</span> : null}
      </summary>
      <ul className="mt-1 divide-y rounded border text-xs">
        {components.map((c) => (
          <li key={c.component_product_id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1">
            <span className="font-mono">{c.component_code}</span>
            <span className="text-muted-foreground truncate max-w-[12rem]">{c.component_name}</span>
            <span className="ml-auto tabular-nums whitespace-nowrap">
              need {fmtNum(c.required)} · free {fmtNum(c.free_for_this)}
              {Number(c.shortfall) > 0 && <span className="text-red-600"> · short {fmtNum(c.shortfall)}</span>}
            </span>
          </li>
        ))}
        {materials.map((m, i) => (
          <li key={`${m.material_id}-${m.via_component_code ?? ''}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1">
            <span>{m.material_name ?? '—'}</span>
            {m.via_component_code && (
              <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground" title="Needed for this part of the set">
                via {m.via_component_code}
              </span>
            )}
            <span className="ml-auto tabular-nums whitespace-nowrap">
              need {fmtNum(m.required)} {m.unit ?? ''} · free {fmtNum(m.free_for_this)}
              {Number(m.shortfall) > 0 && <span className="text-red-600"> · short {fmtNum(m.shortfall)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Where each closure step (invoice → payment) gets fixed, per DC that carries this line. */
function closureStepLinks(step: ReadinessStep, dcs: ClosureDC[], orderId: string): StepLink[] {
  const back = encodeURIComponent(`/sales/orders/${orderId}`);
  const confirm = (dc: ClosureDC) => ({ to: `/inventory/dispatch/${dc.dispatch_id}/confirm?back=${back}`, label: dc.dispatch_number });
  switch (step.step_key) {
    case 'invoice':
      return dcs.map((dc) =>
        dc.invoice
          ? { to: `/sales/invoices/${dc.invoice.id}`, label: `${dc.invoice.invoice_number} (${dc.invoice.status})` }
          : { to: '/sales/invoices', label: `${dc.dispatch_number}: make invoice` },
      );
    case 'posted':
      return dcs.filter((dc) => dc.invoice).map((dc) => ({ to: `/accounting/journal-entries?invoice=${dc.invoice!.id}`, label: dc.invoice!.invoice_number }));
    case 'receiving':
    case 'qc_bilty':
      return dcs.map(confirm);
    case 'payment': {
      const seen = new Set<string>();
      return dcs
        .filter((dc) => dc.invoice && !seen.has(dc.invoice.id) && seen.add(dc.invoice.id))
        .map((dc) => ({
          to: `/accounting/receivables?client=${dc.client_id}&invoice=${dc.invoice!.id}`,
          label: `Receipt: ${dc.invoice!.invoice_number}`,
        }));
    }
    default:
      return [];
  }
}

function Stepper({
  steps,
  linksFor,
  extra,
}: {
  steps: ReadinessStep[];
  linksFor: (s: ReadinessStep) => StepLink[];
  extra?: (s: ReadinessStep) => React.ReactNode;
}) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const meta = STATUS_META[s.status] ?? STATUS_META.pending;
        const pct = s.score == null ? null : Math.round(Number(s.score) * 100);
        const na = s.status === 'na';
        const links = s.status === 'done' || na ? [] : linksFor(s);
        return (
          <li key={`${s.step_key}-${i}`} className={cn('relative flex gap-3 pb-4 last:pb-0', na && 'opacity-50')}>
            {i < steps.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden />}
            <span className={cn('relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', meta.dot)}>
              {s.status === 'pending' ? s.step_no : meta.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-medium">{s.step_no}. {s.label}</span>
                {s.label_ur && <span dir="rtl" lang="ur" className="text-sm text-muted-foreground">{s.label_ur}</span>}
                <span className={cn('text-xs font-medium', meta.text)}>
                  {meta.en} <span dir="rtl" lang="ur">{meta.ur}</span>
                </span>
                <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                  {pct != null && `${pct}% · `}wt {Number(s.weight)}
                </span>
              </div>
              {pct != null && !na && (
                <div className="h-1 bg-muted rounded mt-1">
                  <div className={cn('h-1 rounded', s.status === 'blocked' ? 'bg-red-600' : s.status === 'done' ? 'bg-green-600' : 'bg-amber-500')} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              )}
              {na ? (
                <p className="mt-0.5 text-xs text-muted-foreground">Not needed for this item <span dir="rtl" lang="ur">اس آئٹم کے لیے نہیں</span></p>
              ) : (
                s.detail && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line break-words">{s.detail.split(' | ').join('\n')}</p>
              )}
              {s.eta && <p className="text-xs text-muted-foreground">ETA {fmtDate(s.eta)}</p>}
              {links.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {links.map((l) => (
                    <Link
                      key={l.to + l.label}
                      to={l.to}
                      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                    >
                      {l.label} <ChevronRight size={12} />
                    </Link>
                  ))}
                </div>
              )}
              {!na && extra?.(s)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PctPill({ label, ur, value, strong }: { label: string; ur: string; value: number | null | undefined; strong?: boolean }) {
  const v = Number(value ?? 0);
  return (
    <div className={cn('rounded-md border px-3 py-1.5 text-center', strong && 'border-primary')}>
      <div className={cn('font-semibold tabular-nums', strong ? 'text-xl text-primary' : 'text-base')}>{v.toFixed(v % 1 ? 1 : 0)}%</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label} <span dir="rtl" lang="ur">{ur}</span></div>
    </div>
  );
}

/**
 * Two-section stepper for a sales order, per order line:
 *  1) Order (mold → dispatch) from v_so_readiness_steps
 *  2) Closure (bill, receiving, payment) from v_so_closure_steps
 */
export function ReadinessChecklist({
  orderId,
  items,
  summary,
  onOpenLine,
}: {
  orderId: string;
  items: Array<{ id: string; product_id?: string | null; products?: { code?: string; name?: string } | null }>;
  summary: OrderReadinessSummary | undefined;
  /** Opens the Status Boxes for a line. */
  onOpenLine?: (lineId: string) => void;
}) {
  const { data: orderSteps = [], isLoading: l1 } = useReadinessSteps(orderId);
  const { data: closureSteps = [], isLoading: l2 } = useClosureSteps(orderId);
  const { data: dcs = [] } = useOrderClosureLinks(orderId, items.map((i) => i.id));
  const { data: needs } = useSoLineNeeds(orderId);

  if (l1 || l2) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">Loading readiness…</CardContent></Card>;
  }

  const lineIds = items.map((i) => i.id).filter((id) => orderSteps.some((s) => s.sales_order_item_id === id) || closureSteps.some((s) => s.sales_order_item_id === id));
  if (!lineIds.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {lineIds.map((lineId) => {
        const item = items.find((i) => i.id === lineId);
        const line = summary?.lines.find((l) => l.sales_order_item_id === lineId);
        const os = orderSteps.filter((s) => s.sales_order_item_id === lineId);
        const cs = closureSteps.filter((s) => s.sales_order_item_id === lineId);
        const lineDcs = dcs.filter((dc) => dc.sales_order_item_ids.includes(lineId));
        return (
          <Card key={lineId}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base">
                  {item?.products?.code ? `${item.products.code} · ` : ''}{item?.products?.name ?? os[0]?.product_name ?? 'Line'}
                </CardTitle>
                {onOpenLine && (
                  <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => onOpenLine(lineId)}>
                    <LayoutGrid size={13} className="mr-1" /> Status boxes <span dir="rtl" lang="ur" className="ml-1 text-muted-foreground">صورتحال</span>
                  </Button>
                )}
                {line && Number(line.closure_blocked ?? 0) > 0 && (
                  <Badge variant="destructive">{line.closure_blocked} blocked <span dir="rtl" lang="ur" className="ml-1">رکاوٹ</span></Badge>
                )}
                {line && (
                  <div className="ml-auto flex gap-2">
                    <PctPill label="Order" ur="آرڈر" value={line.overall_pct} />
                    <PctPill label="Closure" ur="وصولی" value={line.closure_pct} />
                    <PctPill label="Total" ur="کل" value={line.grand_pct} strong />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <section>
                <h4 className="mb-3 text-sm font-semibold">
                  Order steps <span dir="rtl" lang="ur" className="font-normal text-muted-foreground">آرڈر کے مراحل</span>
                </h4>
                {os.length ? (
                  <Stepper
                    steps={os}
                    linksFor={(s) => orderStepLinks(s, item?.product_id ?? null)}
                    extra={(s) =>
                      ['raw_material', 'pigment', 'packing', 'components'].includes(s.step_key) ? (
                        <NeedsList
                          materials={(needs?.materials ?? []).filter((m) => m.sales_order_item_id === lineId && m.step_key === s.step_key)}
                          components={s.step_key === 'components' ? (needs?.components ?? []).filter((c) => c.sales_order_item_id === lineId) : []}
                        />
                      ) : null
                    }
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </section>
              <section className="lg:border-l lg:pl-6">
                <h4 className="mb-3 text-sm font-semibold">
                  Closure (bill, receiving, payment){' '}
                  <span dir="rtl" lang="ur" className="font-normal text-muted-foreground">بل، وصولی، ادائیگی</span>
                </h4>
                {cs.length ? (
                  <Stepper steps={cs} linksFor={(s) => closureStepLinks(s, lineDcs, orderId)} />
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
                {lineDcs.length > 0 && (
                  <p className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1">
                    <ExternalLink size={11} /> DCs: {lineDcs.map((d) => `${d.dispatch_number} (${fmtDate(d.dispatch_date)})`).join(', ')}
                  </p>
                )}
              </section>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
