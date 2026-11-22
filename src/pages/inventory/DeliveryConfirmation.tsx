import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryConfirmationForm } from '@/components/delivery/DeliveryConfirmationForm';
import { useRealtimeInvalidate } from '@/hooks/useRealtimeInvalidate';
import { fmtDate } from '@/lib/dates';

/**
 * Full-page Delivery Confirmation for one DC — opened from the DC list
 * ("Confirm delivery"), the DC view dialog, or a closure step on a sales
 * order. Laid out for a phone: one column, large tap targets, sticky Save.
 */
export default function DeliveryConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const back = params.get('back');

  const { data: dc, isLoading } = useQuery({
    queryKey: ['dispatch-header', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatches')
        .select('id, dispatch_number, dispatch_date, status, vehicle_number, driver_name, total_pieces, total_cartons, clients(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  useRealtimeInvalidate(['dispatch_delivery_confirmations'], [['delivery-confirmation', id]], !!id);

  const goBack = () => (back ? navigate(back) : navigate('/inventory/dispatch'));

  return (
    <MainLayout title="Delivery Confirmation" subtitle="ڈلیوری کی تصدیق">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={goBack}>
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
        {isLoading || !dc ? (
          <div className="p-6 text-center text-muted-foreground"><Loader2 className="inline mr-2 animate-spin" size={16} />Loading…</div>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2 flex items-center justify-between gap-2">
                  <div className="font-mono font-semibold text-base">{dc.dispatch_number}</div>
                  <Badge variant="outline">{dc.status}</Badge>
                </div>
                <div><div className="text-xs text-muted-foreground">Customer</div><div className="font-medium">{dc.clients?.name ?? '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">DC date</div><div className="font-medium">{fmtDate(dc.dispatch_date)}</div></div>
                <div><div className="text-xs text-muted-foreground">Vehicle / Driver</div><div className="font-medium">{dc.vehicle_number || '—'} · {dc.driver_name || '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">Pieces / Cartons</div><div className="font-medium">{Number(dc.total_pieces || 0).toLocaleString()} / {Number(dc.total_cartons || 0).toLocaleString()}</div></div>
              </CardContent>
            </Card>
            <DeliveryConfirmationForm dispatchId={dc.id} dispatchedQty={dc.total_pieces} onSaved={goBack} />
          </>
        )}
      </div>
    </MainLayout>
  );
}
