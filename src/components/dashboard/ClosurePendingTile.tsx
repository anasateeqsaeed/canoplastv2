import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, PackageCheck, ClipboardCheck, AlertTriangle, Wallet, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/dates';
import { useClosurePending, useReadinessRealtime } from '@/hooks/useOrderReadiness';

function Count({ icon, en, ur, n, tone }: { icon: React.ReactNode; en: string; ur: string; n: number; tone?: string }) {
  return (
    <div className={cn('rounded-md border p-2 text-center', n > 0 && tone)}>
      <div className="flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">{icon}{n}</div>
      <div className="text-[11px] leading-tight text-muted-foreground">{en}</div>
      <div dir="rtl" lang="ur" className="text-[11px] leading-tight text-muted-foreground">{ur}</div>
    </div>
  );
}

/** Dispatched orders whose closure (bill → receiving → payment) isn't finished, oldest dispatch first. */
export function ClosurePendingTile() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useClosurePending();
  useReadinessRealtime();

  const c = {
    invoice: rows.filter((r) => r.invoice_pending).length,
    receiving: rows.filter((r) => r.receiving_pending).length,
    qc: rows.filter((r) => r.qc_pending).length,
    issue: rows.filter((r) => r.issue_open).length,
    payment: rows.filter((r) => r.payment_pending).length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Hourglass className="h-5 w-5 text-primary" />
          Closure pending <span dir="rtl" lang="ur" className="font-normal text-muted-foreground">وصولی باقی</span>
          <Badge variant="secondary" className="ml-auto">{rows.length} orders</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <Count icon={<Receipt size={14} />} en="Invoice not issued" ur="انوائس نہیں بنی" n={c.invoice} tone="border-amber-400" />
          <Count icon={<PackageCheck size={14} />} en="Receiving pending" ur="وصولی باقی" n={c.receiving} tone="border-amber-400" />
          <Count icon={<ClipboardCheck size={14} />} en="QC / bilty pending" ur="کیو سی / بلٹی باقی" n={c.qc} tone="border-amber-400" />
          <Count icon={<AlertTriangle size={14} />} en="Open issues" ur="مسائل" n={c.issue} tone="border-red-500 text-red-600" />
          <Count icon={<Wallet size={14} />} en="Payment pending" ur="ادائیگی باقی" n={c.payment} tone="border-amber-400" />
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing pending — all dispatched orders are closed out.</p>
        ) : (
          <ul className="divide-y rounded-md border max-h-80 overflow-y-auto">
            {rows.map((r) => (
              <li key={r.sales_order_id}>
                <button
                  type="button"
                  onClick={() => navigate(`/sales/orders/${r.sales_order_id}`)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{r.so_number}</span>
                      {r.issue_open && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">issue</Badge>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.client_name} · first DC {fmtDate(r.oldest_dispatch)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      {r.invoice_pending && <span className="rounded bg-muted px-1">invoice</span>}
                      {r.receiving_pending && <span className="rounded bg-muted px-1">receiving</span>}
                      {r.qc_pending && <span className="rounded bg-muted px-1">QC/bilty</span>}
                      {r.payment_pending && <span className="rounded bg-muted px-1">payment</span>}
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <div className="text-sm font-semibold tabular-nums">{r.closure_pct}%</div>
                    <div className="mt-1 h-1 rounded bg-muted">
                      <div className="h-1 rounded bg-primary" style={{ width: `${Math.min(100, r.closure_pct)}%` }} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
