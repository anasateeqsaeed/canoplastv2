import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Zap,
  Sun,
  PlugZap,
  Wallet,
  Sparkles,
  Cpu,
  TrendingUp,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import { format, subMonths, parse } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import {
  useElectricityDaily,
  useMachineEnergy,
  useElectricityTariff,
  type ElectricityDailyRow,
  type MachineEnergyRow,
} from '@/hooks/useElectricityDashboard';

const COLORS = {
  grid: '#2563eb', // KE / utility — blue
  solar: '#f59e0b', // solar — amber (CVD-safe pair with blue, ΔE ~37)
  machine: '#0d9488', // teal
  machineTop: '#0f766e',
};

const nf = (n: number, d = 0) =>
  n.toLocaleString('en-PK', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Last 12 months as {value: 'yyyy-MM', label: 'MMM yyyy'}. */
function useMonthOptions() {
  return useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, i);
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
    });
  }, []);
}

export default function ElectricityDashboard() {
  const monthOptions = useMonthOptions();
  const [monthKey, setMonthKey] = useState(monthOptions[0].value);
  const month = useMemo(() => parse(monthKey, 'yyyy-MM', new Date()), [monthKey]);

  const daily = useElectricityDaily(month);
  const machines = useMachineEnergy(month);
  const tariff = useElectricityTariff(month);

  const dailyRows = useMemo(() => daily.data ?? [], [daily.data]);
  const machineRows = useMemo(() => machines.data ?? [], [machines.data]);

  const totals = useMemo(() => computeTotals(dailyRows, tariff.data), [dailyRows, tariff.data]);
  const insights = useMemo(
    () => buildInsights(dailyRows, machineRows, tariff.data, totals),
    [dailyRows, machineRows, tariff.data, totals],
  );

  const chartData = useMemo(
    () =>
      dailyRows.map((r) => ({
        ...r,
        day: format(new Date(r.date), 'd'),
        isPeak: r.date === totals.peakDate,
      })),
    [dailyRows, totals.peakDate],
  );

  const topMachines = useMemo(() => machineRows.slice(0, 12), [machineRows]);
  const isEmpty = !daily.isLoading && dailyRows.length === 0;

  return (
    <MainLayout
      title="Electricity Consumption"
      subtitle="Daily grid vs solar usage and per-machine energy analysis"
      actions={
        <Select value={monthKey} onValueChange={setMonthKey}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            title="Total Consumption"
            value={`${nf(totals.total)} kWh`}
            isLoading={daily.isLoading}
            icon={<Zap className="h-5 w-5 text-primary" />}
            footer={<span className="text-xs text-muted-foreground">across {totals.days} reading days</span>}
          />
          <Kpi
            title="From Grid (KE)"
            value={`${nf(totals.grid)} kWh`}
            isLoading={daily.isLoading}
            icon={<PlugZap className="h-5 w-5" style={{ color: COLORS.grid }} />}
            footer={
              <span className="text-xs text-muted-foreground">{totals.gridPct}% of total load</span>
            }
          />
          <Kpi
            title="From Solar"
            value={`${nf(totals.solar)} kWh`}
            isLoading={daily.isLoading}
            icon={<Sun className="h-5 w-5" style={{ color: COLORS.solar }} />}
            footer={
              <span className="text-xs text-muted-foreground">
                {totals.solarPct}% self-generated
              </span>
            }
          />
          <Kpi
            title="Estimated Cost"
            value={totals.cost != null ? formatCurrency(totals.cost) : '—'}
            isLoading={daily.isLoading}
            icon={<Wallet className="h-5 w-5 text-warning" />}
            footer={
              <span className="text-xs text-muted-foreground">
                {tariff.data
                  ? `@ KE ${nf(tariff.data.keRate)} / Solar ${nf(tariff.data.solarRate)} per unit`
                  : 'no tariff set'}
              </span>
            }
          />
        </div>

        {isEmpty ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-3 opacity-50" />
              <p className="text-sm">No meter readings recorded for {format(month, 'MMMM yyyy')}.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Daily grid vs solar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Daily Consumption — Grid vs Solar
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Stacked units per day. Taller bar = heavier day; the amber portion is
                  solar-supplied, blue is drawn from the KE grid. The peak day is outlined.
                </p>
              </CardHeader>
              <CardContent>
                {daily.isLoading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                        tickFormatter={(v) => nf(v)}
                      />
                      <Tooltip content={<DailyTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="grid" stackId="e" name="Grid (KE)" fill={COLORS.grid} radius={[0, 0, 2, 2]} />
                      <Bar dataKey="solar" stackId="e" name="Solar" fill={COLORS.solar} radius={[3, 3, 0, 0]}>
                        {chartData.map((d) => (
                          <Cell
                            key={d.date}
                            stroke={d.isPeak ? 'hsl(var(--foreground))' : 'none'}
                            strokeWidth={d.isPeak ? 1.5 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Smart analysis */}
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Smart Analysis
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    auto-generated
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {machines.isLoading || daily.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-5 w-full" />
                    ))}
                  </div>
                ) : insights.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not enough data to analyse this month.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {insights.map((ins, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <ins.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${ins.color}`} />
                        <span dangerouslySetInnerHTML={{ __html: ins.html }} />
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-[11px] text-muted-foreground border-t pt-3">
                  Machine figures are <strong>estimates</strong>: assumed motor rating (kW) × logged run
                  hours, since per-machine energy is not sub-metered. Use them for relative comparison,
                  not billing.
                </p>
              </CardContent>
            </Card>

            {/* Machine comparison chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Estimated Machine Energy Use
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Top machines ranked by estimated units consumed (power rating × run hours) this month.
                </p>
              </CardHeader>
              <CardContent>
                {machines.isLoading ? (
                  <Skeleton className="h-[360px] w-full" />
                ) : topMachines.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No production entries for this month.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(240, topMachines.length * 34)}>
                    <BarChart
                      data={topMachines}
                      layout="vertical"
                      margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickFormatter={(v) => nf(v)}
                      />
                      <YAxis
                        type="category"
                        dataKey="machineCode"
                        width={110}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<MachineTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                      <Bar dataKey="estUnits" name="Est. units (kWh)" radius={[0, 3, 3, 0]}>
                        {topMachines.map((m, i) => (
                          <Cell key={m.machineId} fill={i === 0 ? COLORS.machineTop : COLORS.machine} />
                        ))}
                        <LabelList
                          dataKey="estUnits"
                          position="right"
                          formatter={(v: number) => nf(v)}
                          style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Machine detail table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Machine Usage Breakdown
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  What each machine ran this month, how much it produced, and estimated energy per unit
                  produced.
                </p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {machines.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : machineRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No data.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground text-left">
                        <th className="py-2 pr-3 font-medium">Machine</th>
                        <th className="py-2 px-3 font-medium">Dept</th>
                        <th className="py-2 px-3 font-medium text-right">kW</th>
                        <th className="py-2 px-3 font-medium text-right">Run hrs</th>
                        <th className="py-2 px-3 font-medium text-right">Est. units</th>
                        <th className="py-2 px-3 font-medium text-right">Produced (OK)</th>
                        <th className="py-2 px-3 font-medium text-right">Units / 1k pcs</th>
                        <th className="py-2 pl-3 font-medium">Items made (qty)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {machineRows.map((m) => (
                        <tr key={m.machineId} className="hover:bg-muted/40">
                          <td className="py-2 pr-3 font-medium whitespace-nowrap">{m.machineCode}</td>
                          <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                            {m.department}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {m.powerKw != null ? nf(m.powerKw, 1) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">{nf(m.runHours)}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">
                            {m.powerKw != null ? nf(m.estUnits) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">{nf(m.okQty)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {m.estUnits > 0 && m.okQty > 0
                              ? nf((m.estUnits / m.okQty) * 1000, 1)
                              : '—'}
                          </td>
                          <td className="py-2 pl-3">
                            <div className="flex flex-wrap gap-1">
                              {m.topProducts.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                m.topProducts.slice(0, 3).map((p, idx) => (
                                  <Badge key={idx} variant="outline" className="font-normal text-[11px]">
                                    {p.product}
                                    <span className="ml-1 text-muted-foreground">{nf(p.qty)}</span>
                                  </Badge>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}

/* ------------------------------------------------------------------ helpers */

interface Totals {
  total: number;
  grid: number;
  solar: number;
  submeter: number;
  gridPct: number;
  solarPct: number;
  days: number;
  cost: number | null;
  peakDate: string | null;
  peakUnits: number;
}

function computeTotals(rows: ElectricityDailyRow[], tariff: { keRate: number; solarRate: number } | null | undefined): Totals {
  const grid = rows.reduce((s, r) => s + r.grid, 0);
  const solar = rows.reduce((s, r) => s + r.solar, 0);
  const submeter = rows.reduce((s, r) => s + r.submeter, 0);
  const total = grid + solar;
  let peakDate: string | null = null;
  let peakUnits = 0;
  for (const r of rows) {
    if (r.total > peakUnits) {
      peakUnits = r.total;
      peakDate = r.date;
    }
  }
  const cost = tariff ? Math.round(grid * tariff.keRate + solar * tariff.solarRate) : null;
  return {
    total: Math.round(total),
    grid: Math.round(grid),
    solar: Math.round(solar),
    submeter: Math.round(submeter),
    gridPct: total > 0 ? Math.round((grid / total) * 100) : 0,
    solarPct: total > 0 ? Math.round((solar / total) * 100) : 0,
    days: rows.length,
    cost,
    peakDate,
    peakUnits: Math.round(peakUnits),
  };
}

interface Insight {
  icon: typeof Sparkles;
  color: string;
  html: string;
}

function buildInsights(
  daily: ElectricityDailyRow[],
  machines: MachineEnergyRow[],
  tariff: { keRate: number; solarRate: number } | null | undefined,
  totals: Totals,
): Insight[] {
  const out: Insight[] = [];
  const b = (s: string) => `<strong>${s}</strong>`;
  // Escape DB-sourced text (product names, machine codes) before it goes into
  // the dangerouslySetInnerHTML insight strings.
  const esc = (s: string) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
    );

  if (totals.peakDate) {
    out.push({
      icon: TrendingUp,
      color: 'text-info',
      html: `Heaviest day was ${b(format(new Date(totals.peakDate), 'EEE, d MMM'))} at ${b(
        `${nf(totals.peakUnits)} kWh`,
      )} — about ${b(
        `${totals.total > 0 ? Math.round((totals.peakUnits / (totals.total / totals.days)) * 100) : 0}%`,
      )} of an average day.`,
    });
  }

  if (totals.total > 0) {
    const savings = tariff
      ? Math.round(totals.solar * Math.max(tariff.keRate - tariff.solarRate, 0))
      : null;
    out.push({
      icon: Sun,
      color: 'text-warning',
      html: `Solar supplied ${b(`${totals.solarPct}%`)} of the load (${b(
        `${nf(totals.solar)} kWh`,
      )}); the grid covered the remaining ${b(`${totals.gridPct}%`)}.${
        savings != null && savings > 0
          ? ` Self-generation saved roughly ${b(formatCurrency(savings))} vs buying it from KE.`
          : ''
      }`,
    });
  }

  const rated = machines.filter((m) => m.powerKw != null && m.estUnits > 0);
  const totalEst = rated.reduce((s, m) => s + m.estUnits, 0);
  const top = rated[0];
  if (top && totalEst > 0) {
    const topProd = top.topProducts[0];
    out.push({
      icon: Cpu,
      color: 'text-primary',
      html: `${b(esc(top.machineCode))} is the top energy user — est. ${b(
        `${nf(top.estUnits)} kWh`,
      )} (${b(`${Math.round((top.estUnits / totalEst) * 100)}%`)} of estimated machine load) over ${b(
        `${nf(top.runHours)} run hrs`,
      )}${
        topProd
          ? `, mostly making ${b(esc(topProd.product))} (${nf(topProd.qty)} pcs)`
          : ''
      }.`,
    });
  }

  // Most efficient producer: lowest units per 1000 pcs among machines that made something.
  const producers = rated.filter((m) => m.okQty > 500);
  if (producers.length >= 2) {
    const eff = [...producers].sort(
      (a, b2) => a.estUnits / a.okQty - b2.estUnits / b2.okQty,
    );
    const best = eff[0];
    const worst = eff[eff.length - 1];
    out.push({
      icon: Gauge,
      color: 'text-success',
      html: `Most energy-efficient run: ${b(esc(best.machineCode))} at ${b(
        `${nf((best.estUnits / best.okQty) * 1000, 1)} kWh / 1k pcs`,
      )} — vs ${b(esc(worst.machineCode))} at ${nf((worst.estUnits / worst.okQty) * 1000, 1)}, so the same
      output costs ${b(
        `${(worst.estUnits / worst.okQty / (best.estUnits / best.okQty)).toFixed(1)}×`,
      )} more energy on ${esc(worst.machineCode)}.`,
    });
  }

  // Reconciliation: estimated machine load vs metered total.
  if (totalEst > 0 && totals.total > 0) {
    const pct = Math.round((totalEst / totals.total) * 100);
    out.push({
      icon: Zap,
      color: 'text-muted-foreground',
      html: `Estimated machine load is ${b(`${nf(Math.round(totalEst))} kWh`)} (~${b(
        `${pct}%`,
      )} of metered consumption); the rest is compressors, lighting, offices and idle draw.`,
    });
  }

  return out;
}

/* ------------------------------------------------------------- subcomponents */

function Kpi({
  title,
  value,
  isLoading,
  icon,
  footer,
}: {
  title: string;
  value?: string | number;
  isLoading: boolean;
  icon: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-24 mb-2" />
        ) : (
          <div className="text-2xl font-bold">{value ?? '—'}</div>
        )}
        <div className="mt-1">{footer}</div>
      </CardContent>
    </Card>
  );
}

function DailyTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ElectricityDailyRow & { day: string };
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium mb-1">{format(new Date(row.date), 'EEE, d MMM yyyy')}</div>
      <Row label="Grid (KE)" value={row.grid} color={COLORS.grid} />
      <Row label="Solar" value={row.solar} color={COLORS.solar} />
      <div className="mt-1 border-t pt-1 flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold tabular-nums">{nf(Math.round(row.total))} kWh</span>
      </div>
    </div>
  );
}

function MachineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const m = payload[0]?.payload as MachineEnergyRow;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md max-w-[240px]">
      <div className="font-medium mb-1">{m.machineCode}</div>
      <div className="text-muted-foreground mb-1.5">{m.department}</div>
      <Row label="Est. units" value={m.estUnits} suffix=" kWh" />
      <Row label="Run hours" value={m.runHours} />
      <Row label="Produced (OK)" value={m.okQty} suffix=" pcs" />
      {m.topProducts.length > 0 && (
        <div className="mt-1.5 border-t pt-1.5">
          <div className="text-muted-foreground mb-0.5">Items made</div>
          {m.topProducts.slice(0, 3).map((p, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="truncate">{p.product}</span>
              <span className="tabular-nums text-muted-foreground">{nf(p.qty)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  color,
  suffix = '',
}: {
  label: string;
  value: number;
  color?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {color && <span className="h-2 w-2 rounded-sm" style={{ background: color }} />}
        {label}
      </span>
      <span className="tabular-nums">
        {nf(Math.round(value))}
        {suffix}
      </span>
    </div>
  );
}
