import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productCode?: string;
  productName?: string;
}

interface PriceRow {
  id: string;
  selling_price: number;
  labour_price: number;
  price_unit: string;
  effective_from: string;
  note: string | null;
  created_at: string;
}

export function ProductRateHistoryDialog({
  open,
  onOpenChange,
  productId,
  productCode,
  productName,
}: Props) {
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [sellingPrice, setSellingPrice] = useState('');
  const [labourPrice, setLabourPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('piece');
  const [effectiveFrom, setEffectiveFrom] = useState(todayStr);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setSellingPrice('');
      setLabourPrice('');
      setPriceUnit('piece');
      setEffectiveFrom(todayStr);
      setNote('');
    }
  }, [open, todayStr]);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['product-price-history', productId],
    queryFn: async () => {
      if (!productId) return [] as PriceRow[];
      const { data, error } = await supabase
        .from('product_price_history')
        .select('id, selling_price, labour_price, price_unit, effective_from, note, created_at')
        .eq('product_id', productId)
        .order('effective_from', { ascending: false });
      if (error) throw error;
      return (data || []) as PriceRow[];
    },
    enabled: !!productId && open,
  });

  const addRate = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('No product selected');
      const sp = Number(sellingPrice) || 0;
      const lp = Number(labourPrice) || 0;
      if (sp <= 0 && lp <= 0) {
        throw new Error('Enter at least one of selling price or labour price');
      }
      if (!effectiveFrom) {
        throw new Error('Pick an effective date');
      }
      const userRes = await supabase.auth.getUser();
      const { error } = await supabase.from('product_price_history').insert({
        product_id: productId,
        selling_price: sp,
        labour_price: lp,
        price_unit: priceUnit,
        effective_from: effectiveFrom,
        note: note.trim() || null,
        created_by: userRes.data.user?.id ?? null,
      });
      if (error) throw error;

      // Mirror onto products table only if this is the latest rate.
      const isLatest = !history.length || effectiveFrom >= history[0].effective_from;
      if (isLatest) {
        await supabase
          .from('products')
          .update({
            selling_price: sp,
            labour_price: lp,
            price_unit: priceUnit,
          })
          .eq('id', productId);
      }
    },
    onSuccess: () => {
      toast.success('New rate added — applies from selected date forward');
      queryClient.invalidateQueries({ queryKey: ['product-price-history', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSellingPrice('');
      setLabourPrice('');
      setNote('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add rate'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rate History</DialogTitle>
          <DialogDescription>
            {productCode ? <span className="font-mono">{productCode}</span> : null}
            {productCode && productName ? ' — ' : ''}
            {productName}
            <div className="mt-1 text-xs text-muted-foreground">
              New rates apply from the chosen date forward. Past production and
              dispatches keep the rate that was effective on their own date.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 space-y-3">
            <div className="text-sm font-medium">Add new rate</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={priceUnit} onValueChange={setPriceUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Per Piece</SelectItem>
                    <SelectItem value="kg">Per Kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Labour Price (Rs)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={labourPrice}
                  onChange={(e) => setLabourPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Selling Price (Rs, w/ material)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <Label>Note (optional)</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Q2 2026 revision"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => addRate.mutate()}
                disabled={addRate.isPending || !productId}
              >
                {addRate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Rate
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">History</div>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 600 }}>
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2">Effective From</th>
                    <th className="text-right px-3 py-2">Labour</th>
                    <th className="text-right px-3 py-2">Selling</th>
                    <th className="text-left px-3 py-2">Unit</th>
                    <th className="text-left px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">Loading…</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">No rates yet</td></tr>
                  ) : (
                    history.map((row, idx) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2">
                          {format(new Date(row.effective_from), 'dd MMM yyyy')}
                          {idx === 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{Number(row.labour_price).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono">{Number(row.selling_price).toFixed(2)}</td>
                        <td className="px-3 py-2">{row.price_unit === 'kg' ? '/kg' : '/pc'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.note || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
