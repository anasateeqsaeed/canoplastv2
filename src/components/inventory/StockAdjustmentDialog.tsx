import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import {
  useCreateStockAdjustment,
  type AdjustmentScope,
  type AdjustmentReasonType,
} from '@/hooks/useStockAdjustment';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { useMaterials } from '@/hooks/useMaterials';
import { SearchableComboBox } from '@/components/ui/searchable-combobox';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: AdjustmentScope;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  currentQty: number;
  defaultMode?: 'correction' | 'opening';
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  scope,
  itemId,
  itemCode,
  itemName,
  currentQty,
  defaultMode = 'correction',
}: Props) {
  const { isAdmin } = useAuth();
  const admin = isAdmin();
  const isFG = scope === 'finished_good';
  const [mode, setMode] = useState<'correction' | 'opening'>(defaultMode);
  const [closingMonth, setClosingMonth] = useState<Date>(() => endOfMonth(new Date()));
  const [asOfDate, setAsOfDate] = useState<Date>(() => new Date());
  const [newQty, setNewQty] = useState<string>(String(currentQty ?? 0));
  const [reason, setReason] = useState('');

  // FG-only state
  const [reasonType, setReasonType] = useState<AdjustmentReasonType>('physical_shortage');
  const [reverseRevenue, setReverseRevenue] = useState(false);
  const [reverseConsumption, setReverseConsumption] = useState(false);
  const [createRegrind, setCreateRegrind] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [materialId, setMaterialId] = useState<string>('');

  // Product weight_per_piece lookup reconnects in Phase 3 (products table)
  const wpp = 0;

  const { data: materials = [] } = useMaterials();
  const materialOptions = useMemo(
    () =>
      materials
        .filter((m: any) => m.is_active !== false)
        .map((m: any) => ({
          value: m.id,
          label: `${m.code ?? ''} - ${m.name ?? ''}`.replace(/^ - /, ''),
        })),
    [materials],
  );

  // Track whether the user has manually edited "new qty" so we don't overwrite
  // their in-progress input when the fetched on-hand value arrives or changes.
  const newQtyDirty = useRef(false);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setNewQty(defaultMode === 'opening' ? '0' : String(currentQty ?? 0));
      newQtyDirty.current = false;
      setReason('');
      setClosingMonth(endOfMonth(new Date()));
      setAsOfDate(new Date());
      setReasonType(defaultMode === 'opening' ? 'opening' : 'physical_shortage');
      setReverseRevenue(isFG && defaultMode !== 'opening');
      setReverseConsumption(isFG && defaultMode !== 'opening');
      setCreateRegrind(false);
      setClientId('');
      setMaterialId('');
    }
  }, [open, currentQty, defaultMode, isFG]);

  useEffect(() => {
    // Reset dirty flag on mode switch so we re-seed from the fresh on-hand value.
    newQtyDirty.current = false;
    setNewQty(mode === 'opening' ? '0' : String(currentQty ?? 0));
  }, [mode, currentQty]);

  // Effective as-of date for the on-hand lookup.
  const effectiveAsOf = mode === 'opening' ? asOfDate : endOfMonth(closingMonth);
  const asOfIso = format(effectiveAsOf, 'yyyy-MM-dd');

  // Reset dirty flag whenever the as-of date changes so the box re-seeds.
  useEffect(() => {
    newQtyDirty.current = false;
  }, [asOfIso]);

  // Live on-hand balance for the picked item as of the chosen date.
  const { data: onHandData, isFetching: onHandLoading } = useQuery({
    queryKey: ['adjustment-onhand', scope, itemId, asOfIso],
    enabled: open && !!itemId,
    queryFn: async () => {
      if (scope === 'raw_material') {
        const { data, error } = await supabase
          .from('material_lots')
          .select('remaining_qty')
          .eq('material_id', itemId)
          .lte('received_date', asOfIso);
        if (error) throw error;
        return (data ?? []).reduce(
          (s: number, r: any) => s + Number(r.remaining_qty ?? 0),
          0,
        );
      }

      // FG / component on-hand computation reconnects in Phase 3/5
      // (production, dispatch and stock_transactions tables)
      return 0;
    },
  });
  const onHandQty = Number(onHandData ?? 0);

  // Seed the "new qty" input from the freshly fetched on-hand value, unless the
  // user has already typed something.
  useEffect(() => {
    if (!open) return;
    if (onHandLoading) return;
    if (newQtyDirty.current) return;
    setNewQty(String(onHandQty));
  }, [open, onHandLoading, onHandQty]);

  // Sensible defaults per reason
  useEffect(() => {
    if (!isFG || mode === 'opening') return;
    if (reasonType === 'physical_shortage') {
      setReverseRevenue(true);
      setReverseConsumption(true);
      setCreateRegrind(false);
    } else if (reasonType === 'qc_reject_regrind') {
      setReverseRevenue(true);
      setReverseConsumption(true);
      setCreateRegrind(true);
    } else if (reasonType === 'other') {
      setReverseRevenue(false);
      setReverseConsumption(false);
      setCreateRegrind(false);
    }
  }, [reasonType, isFG, mode]);

  const mutate = useCreateStockAdjustment();

  if (!admin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin only</DialogTitle>
            <DialogDescription className="flex items-center gap-2 pt-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Only administrators can adjust closing stock.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Use the live on-hand balance once loaded; while loading, fall back to the
  // caller-supplied currentQty (for correction mode) or 0 (for opening).
  const fallbackBefore = mode === 'opening' ? 0 : Number(currentQty || 0);
  const effectiveBefore = onHandLoading ? fallbackBefore : onHandQty;
  const delta = Number(newQty || 0) - effectiveBefore;
  const today = new Date();
  const showFGImpacts = isFG && mode === 'correction';
  const needsClient = showFGImpacts && reverseConsumption;
  const needsMaterial = showFGImpacts && (reverseConsumption || createRegrind);
  const kgImpact = Math.abs(delta) * wpp;

  const canSubmit =
    !!reason.trim() &&
    delta !== 0 &&
    !mutate.isPending &&
    !onHandLoading &&
    (!needsClient || !!clientId) &&
    (!needsMaterial || !!materialId) &&
    (!needsMaterial || wpp > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await mutate.mutateAsync({
      scope,
      item_id: itemId,
      item_code: itemCode,
      item_name: itemName,
      closing_month: closingMonth,
      as_of_date: asOfDate,
      mode,
      before_qty: effectiveBefore,
      after_qty: Number(newQty || 0),
      reason: reason.trim(),
      reason_type: mode === 'opening' ? 'opening' : reasonType,
      reverse_labour_revenue: showFGImpacts && reverseRevenue,
      reverse_material_consumption: showFGImpacts && reverseConsumption,
      create_regrind_return: showFGImpacts && createRegrind,
      client_id: clientId || null,
      consumption_material_id: materialId || null,
      weight_per_piece: wpp,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {itemName ?? itemId} {itemCode ? `(${itemCode})` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="correction">Correction</TabsTrigger>
              <TabsTrigger value="opening">Opening balance</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === 'opening' ? (
            <div className="flex gap-2 items-start text-xs text-muted-foreground bg-muted/40 border rounded-md p-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Use this when stock existed before the system started tracking it.
                Posts a one-time opening quantity on the chosen date.
              </span>
            </div>
          ) : null}

          {mode === 'opening' ? (
            <div className="space-y-2">
              <Label>Opening as-of date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(asOfDate, 'dd MMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={asOfDate}
                    onSelect={(d) => d && setAsOfDate(d)}
                    disabled={(d) => d > today}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Closing month</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endOfMonth(closingMonth), 'MMM yyyy')} (posts at month-end)
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={closingMonth}
                    onSelect={(d) => d && setClosingMonth(d)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                On-hand as of {format(effectiveAsOf, 'dd MMM yyyy')}
              </Label>
              <div className="h-10 flex items-center px-3 border rounded-md bg-muted/40 font-mono">
                {onHandLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  effectiveBefore.toLocaleString()
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Add to or subtract from this to get your target qty.
              </p>
            </div>
            <div className="space-y-1">
              <Label>{mode === 'opening' ? 'Opening qty' : 'New closing qty'}</Label>
              <Input
                type="number"
                step="0.01"
                value={newQty}
                onChange={(e) => {
                  newQtyDirty.current = true;
                  setNewQty(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="text-sm">
            Delta:{' '}
            <span
              className={cn(
                'font-mono font-semibold',
                delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : '',
              )}
            >
              {delta > 0 ? '+' : ''}
              {delta.toLocaleString()}
            </span>
          </div>

          {showFGImpacts && (
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              <div className="space-y-2">
                <Label>Adjustment reason</Label>
                <Select value={reasonType} onValueChange={(v) => setReasonType(v as AdjustmentReasonType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical_shortage">Physical shortage (month-end count)</SelectItem>
                    <SelectItem value="qc_reject_regrind">QC reject → return to regrind</SelectItem>
                    <SelectItem value="other">Other correction (FG qty only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Impacts</Label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={reverseRevenue} onCheckedChange={(v) => setReverseRevenue(!!v)} />
                  Reverse labour revenue (production qty)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={reverseConsumption} onCheckedChange={(v) => setReverseConsumption(!!v)} />
                  Reverse customer material consumption
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={createRegrind} onCheckedChange={(v) => setCreateRegrind(!!v)} />
                  Create regrind return lot
                </label>
              </div>

              {needsClient && (
                <div className="space-y-2">
                  <Label>Customer (whose material was consumed)</Label>
                  <ClientSelector value={clientId} onChange={setClientId} />
                </div>
              )}

              {needsMaterial && (
                <div className="space-y-2">
                  <Label>Material {createRegrind ? '(regrind target)' : '(consumption reversal)'}</Label>
                  <SearchableComboBox
                    options={materialOptions}
                    value={materialId}
                    onChange={setMaterialId}
                    placeholder="Select material..."
                  />
                  {wpp > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Will post {kgImpact.toFixed(2)} kg ({Math.abs(delta)} pcs × {wpp} kg/pc).
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">
                      Product has no weight_per_piece — set it on the product master first.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason (required)</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                mode === 'opening'
                  ? 'e.g. Pre-system opening stock from physical count on 1 Jan 2026'
                  : 'e.g. Physical count variance for Oct 2025'
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {mutate.isPending
              ? 'Posting…'
              : mode === 'opening'
                ? 'Post Opening Balance'
                : 'Post Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
