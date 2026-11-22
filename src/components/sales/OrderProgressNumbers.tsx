import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, OctagonAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCloseSalesOrder, type OrderReadinessSummary } from '@/hooks/useOrderReadiness';

const fmt = (v: number) => `${v % 1 ? v.toFixed(1) : v.toFixed(0)}%`;

/**
 * Outside view of an order's progress: Order % · Closure % · big Total %,
 * a red badge when closure is blocked, and "Ready to close" when both phases
 * are at 100%.
 */
export function OrderProgressNumbers({
  summary,
  status,
  compact,
}: {
  summary: OrderReadinessSummary | undefined;
  status: string;
  compact?: boolean;
}) {
  const close = useCloseSalesOrder();
  if (!summary) return <span className="text-xs text-muted-foreground">—</span>;
  const canClose = summary.ready_to_close && status !== 'closed' && status !== 'cancelled';

  return (
    <div className={cn('flex items-center gap-3', compact ? 'flex-wrap' : 'flex-wrap md:flex-nowrap')} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-end gap-3">
        <div className="text-center leading-tight">
          <div className="text-sm font-medium tabular-nums">{fmt(summary.overall_pct)}</div>
          <div className="text-[10px] text-muted-foreground">Order <span dir="rtl" lang="ur">آرڈر</span></div>
        </div>
        <div className="text-center leading-tight">
          <div className="text-sm font-medium tabular-nums">{fmt(summary.closure_pct)}</div>
          <div className="text-[10px] text-muted-foreground">Closure <span dir="rtl" lang="ur">وصولی</span></div>
        </div>
        <div className="text-center leading-tight">
          <div
            className={cn(
              'font-bold tabular-nums',
              compact ? 'text-xl' : 'text-3xl',
              summary.grand_pct >= 100 ? 'text-green-600' : 'text-primary',
            )}
          >
            {fmt(summary.grand_pct)}
          </div>
          <div className="text-[10px] text-muted-foreground">Total <span dir="rtl" lang="ur">کل</span></div>
        </div>
      </div>
      {summary.closure_blocked > 0 && (
        <Badge variant="destructive" className="gap-1 whitespace-nowrap">
          <OctagonAlert size={12} /> {summary.closure_blocked} blocked <span dir="rtl" lang="ur">رکاوٹ</span>
        </Badge>
      )}
      {canClose && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size={compact ? 'sm' : 'default'} className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap">
              <CheckCircle2 size={14} className="mr-1" /> Ready to close
              <span dir="rtl" lang="ur" className="ml-1">بند کریں</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close {summary.so_number}?</AlertDialogTitle>
              <AlertDialogDescription>
                Order and closure are both 100% — dispatched, invoiced, received, QC'd and paid. The order status becomes “closed”.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={() => close.mutate(summary.sales_order_id)}>
                Close order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
