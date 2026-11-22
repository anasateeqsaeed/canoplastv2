import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBomCheck, BOM_STATUS_META, isWarningIssue, type BomCheckRow, type BomStatus } from '@/hooks/useBom';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';

const ORDER: Record<BomStatus, number> = { error: 0, missing: 1, warning: 2, ok: 3 };
const STATUSES: BomStatus[] = ['ok', 'warning', 'error', 'missing'];

function IssueChips({ row }: { row: BomCheckRow }) {
  if (!row.issues.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {row.issues.map((i) => (
        <span
          key={i}
          className={cn(
            'rounded px-1.5 py-0.5 text-[11px] leading-tight',
            row.bom_status === 'missing'
              ? BOM_STATUS_META.missing.chip
              : isWarningIssue(i)
                ? BOM_STATUS_META.warning.chip
                : BOM_STATUS_META.error.chip,
          )}
        >
          {i}
        </span>
      ))}
    </div>
  );
}

function StatusPill({ s }: { s: BomStatus }) {
  const m = BOM_STATUS_META[s];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] whitespace-nowrap', m.chip)}>
      <span className={cn('h-2 w-2 rounded-full', m.dot)} /> {m.en}
    </span>
  );
}

export default function BomCheck() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useBomCheck({ activeOnly: true });
  useRealtimeInvalidate(['product_bom_lines', 'products'], [['bom-check']]);
  const [status, setStatus] = useState<'all' | BomStatus>('all');
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');

  const counts = useMemo(() => {
    const c: Record<BomStatus, number> = { ok: 0, warning: 0, error: 0, missing: 0 };
    rows.forEach((r) => { c[r.bom_status] = (c[r.bom_status] ?? 0) + 1; });
    return c;
  }, [rows]);
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort() as string[], [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => status === 'all' || r.bom_status === status)
      .filter((r) => category === 'all' || r.category === category)
      .filter((r) => !term || `${r.code} ${r.name}`.toLowerCase().includes(term))
      .sort((a, b) => ORDER[a.bom_status] - ORDER[b.bom_status] || b.issue_count - a.issue_count || a.code.localeCompare(b.code));
  }, [rows, status, category, q]);

  const open = (id: string) => navigate(`/masters/products?bom=${id}`);

  return (
    <MainLayout title="BOM Check" subtitle="میٹریل لسٹ کی جانچ — active products">
      <div className="space-y-4">
        {/* Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUSES.map((s) => {
            const m = BOM_STATUS_META[s];
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(active ? 'all' : s)}
                className={cn('rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/40', active && 'ring-2 ring-primary')}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('h-3 w-3 rounded-full', m.dot)} />
                  <span className="text-2xl font-bold tabular-nums">{counts[s]}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {m.en} <span dir="rtl" lang="ur">{m.ur}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search code / name…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{BOM_STATUS_META[s].en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : (
          <>
            {/* Phone: cards */}
            <div className="space-y-2 sm:hidden">
              {filtered.map((r) => (
                <button key={r.product_id} type="button" onClick={() => open(r.product_id)} className="w-full rounded-lg border bg-card p-3 text-left space-y-1.5">
                  <div className="flex items-center gap-2">
                    <StatusPill s={r.bom_status} />
                    <span className="font-mono text-sm font-medium">{r.code}</span>
                    <ChevronRight size={14} className="ml-auto text-muted-foreground" />
                  </div>
                  <div className="text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.category} · {r.weight_g ? `${r.weight_g} g` : 'no weight'} · grams {r.molding_g} · {r.lines} lines
                  </div>
                  <IssueChips row={r} />
                </button>
              ))}
              {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nothing here</p>}
            </div>

            {/* Desktop: table */}
            <Card className="hidden sm:block">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Weight g</TableHead>
                        <TableHead className="text-right">BOM g</TableHead>
                        <TableHead className="text-right">Pigment %</TableHead>
                        <TableHead className="text-right">Lines</TableHead>
                        <TableHead>Issues <span dir="rtl" lang="ur" className="font-normal text-muted-foreground">مسائل</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => {
                        const pig = r.base_g + r.mb_g > 0 ? (r.mb_g / (r.base_g + r.mb_g)) * 100 : null;
                        return (
                          <TableRow key={r.product_id} className="cursor-pointer hover:bg-muted/40" onClick={() => open(r.product_id)}>
                            <TableCell><StatusPill s={r.bom_status} /></TableCell>
                            <TableCell>
                              <div className="font-mono text-sm font-medium text-primary">{r.code}</div>
                              <div className="text-xs text-muted-foreground">{r.name}</div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.category}
                              {r.product_type && r.product_type !== 'finished' && <span className="text-muted-foreground"> · {r.product_type}</span>}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{r.weight_g || '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.molding_g ? Math.round(r.molding_g * 1000) / 1000 : '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">{pig == null ? '—' : pig.toFixed(2)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.lines}
                              {r.n_components > 0 && <span className="text-xs text-muted-foreground"> ({r.n_components} parts)</span>}
                            </TableCell>
                            <TableCell className="max-w-md"><IssueChips row={r} /></TableCell>
                          </TableRow>
                        );
                      })}
                      {filtered.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nothing here</TableCell></TableRow>
                      )}
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
