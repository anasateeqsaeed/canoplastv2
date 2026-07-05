import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { ConsigneeSelector } from '@/components/selectors/ConsigneeSelector';
import { ProductSelector } from '@/components/selectors/ProductSelector';
// Packing types master + packing configs reconnect in Phase 5

import { useDispatchItems, useUpdateDispatch, type Dispatch } from '@/hooks/useDispatches';
import { useProducts } from '@/hooks/useProducts';
import { useProductStockBalances } from '@/hooks/useFinishedGoodsStock';
// DriverSelector / StaffSelector reconnect in Phase 5

interface EditableLine {
  id?: string; // existing row id
  product_id: string;
  packing_type_id: string;
  qty_per_pack: number;
  num_packs: number;
  loose_qty: number;
  total_qty: number;
  weight_kg: number;
  remarks: string;
  agreed_selling_price: number | null;
  agreed_labour_price: number | null;
  rate_overridden: boolean;
}

interface Props {
  dispatch: Dispatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDispatchDialog({ dispatch, open, onOpenChange }: Props) {
  const { data: existingItems = [], isLoading: itemsLoading } = useDispatchItems(dispatch?.id);
  const { data: products = [] } = useProducts();
  const { data: stockBalances } = useProductStockBalances();
  const updateDispatch = useUpdateDispatch();

  const [clientId, setClientId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [consigneeName, setConsigneeName] = useState('');
  const [items, setItems] = useState<EditableLine[]>([]);
  const [showNegativeStockConfirm, setShowNegativeStockConfirm] = useState(false);
  // Snapshot of original totals per existing item id (used for delta calculation)
  const [originalSnapshot, setOriginalSnapshot] = useState<EditableLine[]>([]);

  // Prefill when dispatch + items load
  useEffect(() => {
    if (!dispatch) return;
    setClientId(dispatch.client_id);
    setVehicleNumber(dispatch.vehicle_number || '');
    setDriverName(dispatch.driver_name || '');
    setDriverPhone(dispatch.driver_phone || '');
    setDispatchedBy(dispatch.dispatched_by || '');
    setDispatchDate(dispatch.dispatch_date);
    setRemarks(dispatch.remarks || '');
    setIsThirdParty(dispatch.is_third_party);
    setConsigneeName(dispatch.consignee_name || '');
  }, [dispatch]);

  useEffect(() => {
    if (!dispatch || itemsLoading) return;
    const lines: EditableLine[] = existingItems.map(it => ({
      id: it.id,
      product_id: it.product_id,
      packing_type_id: it.packing_type_id || '',
      qty_per_pack: 0, // packing configs reconnect in Phase 5
      num_packs: it.num_packs,
      loose_qty: it.loose_qty,
      total_qty: it.total_qty,
      weight_kg: it.weight_kg || 0,
      remarks: it.remarks || '',
      agreed_selling_price: it.agreed_selling_price ?? null,
      agreed_labour_price: it.agreed_labour_price ?? null,
      rate_overridden: false,
    }));
    setItems(lines);
    setOriginalSnapshot(lines.map(l => ({ ...l })));
  }, [dispatch, existingItems, itemsLoading]);

  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (stockBalances) stockBalances.forEach((bal, pid) => { map[pid] = bal; });
    return map;
  }, [stockBalances]);

  const getProductWeight = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId) as any;
    // Prefer customer-agreed weight on dispatch; fall back to actual moulded weight
    return product?.agreed_weight_per_piece || product?.weight_per_piece || 0;
  }, [products]);

  const recalculate = useCallback((item: EditableLine): EditableLine => {
    const qtyPerPack = item.qty_per_pack || 0;
    if (qtyPerPack > 0) {
      // Loose is treated as additional PACKS
      const total_qty = ((item.num_packs || 0) + (item.loose_qty || 0)) * qtyPerPack;
      const weightGrams = getProductWeight(item.product_id);
      const weight_kg = weightGrams > 0 ? (total_qty * weightGrams) / 1000 : item.weight_kg;
      return { ...item, total_qty, weight_kg };
    }
    return item;
  }, [getProductWeight]);

  const addItem = () => setItems(prev => [...prev, { product_id: '', packing_type_id: '', qty_per_pack: 0, num_packs: 0, loose_qty: 0, total_qty: 0, weight_kg: 0, remarks: '', agreed_selling_price: null, agreed_labour_price: null, rate_overridden: false }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value } as EditableLine;
      if (field === 'product_id') {
        const p: any = products.find(pp => pp.id === value);
        if (p && updated.agreed_selling_price == null) {
          updated.agreed_selling_price = Number(p.selling_price) || 0;
          updated.agreed_labour_price = Number(p.labour_price) || 0;
        }
      }
      if (field === 'agreed_selling_price' || field === 'agreed_labour_price') {
        updated.rate_overridden = true;
      }
      if (['product_id', 'qty_per_pack', 'num_packs', 'loose_qty'].includes(field)) {
        return recalculate(updated);
      }
      return updated;
    }));
  };

  const isAutoCalc = (item: EditableLine) => (item.qty_per_pack || 0) > 0;

  const totalPieces = items.reduce((s, i) => s + i.total_qty, 0);
  const totalCartons = items.reduce((s, i) => s + i.num_packs, 0);
  const totalWeight = items.reduce((s, i) => s + i.weight_kg, 0);

  // Compute negative-stock based on net delta vs current stock
  const negativeStockItems = useMemo(() => {
    const newByProduct: Record<string, number> = {};
    items.forEach(i => {
      if (i.product_id && i.total_qty > 0) newByProduct[i.product_id] = (newByProduct[i.product_id] || 0) + i.total_qty;
    });
    const oldByProduct: Record<string, number> = {};
    originalSnapshot.forEach(i => {
      if (i.product_id) oldByProduct[i.product_id] = (oldByProduct[i.product_id] || 0) + i.total_qty;
    });
    const productIds = new Set([...Object.keys(newByProduct), ...Object.keys(oldByProduct)]);
    const out: { name: string; code: string; requested: number; available: number; shortBy: number }[] = [];
    productIds.forEach(pid => {
      const delta = (newByProduct[pid] || 0) - (oldByProduct[pid] || 0);
      if (delta <= 0) return; // reducing or unchanged is always safe
      const avail = stockMap[pid] ?? 0;
      if (delta > avail) {
        const product = products.find(p => p.id === pid);
        out.push({
          name: product?.name || 'Unknown',
          code: product?.code || '',
          requested: delta,
          available: avail,
          shortBy: delta - avail,
        });
      }
    });
    return out;
  }, [items, originalSnapshot, stockMap, products]);

  const doSave = () => {
    if (!dispatch) return;
    updateDispatch.mutate({
      id: dispatch.id,
      dispatch_number: dispatch.dispatch_number,
      header: {
        client_id: clientId,
        dispatch_date: dispatchDate,
        vehicle_number: vehicleNumber || null,
        driver_name: driverName || null,
        driver_phone: driverPhone || null,
        dispatched_by: dispatchedBy || null,
        remarks: remarks || null,
        is_third_party: isThirdParty,
        consignee_name: isThirdParty ? (consigneeName || null) : null,
        total_pieces: totalPieces,
        total_cartons: totalCartons,
        total_weight_kg: totalWeight,
      },
      newItems: items
        .filter(i => i.product_id)
        .map(({ qty_per_pack, rate_overridden, ...rest }) => ({
          id: rest.id,
          product_id: rest.product_id,
          packing_type_id: rest.packing_type_id || null,
          num_packs: rest.num_packs,
          loose_qty: rest.loose_qty,
          total_qty: rest.total_qty,
          weight_kg: rest.weight_kg,
          remarks: rest.remarks || null,
          agreed_selling_price: rest.agreed_selling_price,
          agreed_labour_price: rest.agreed_labour_price,
          rate_source: rate_overridden ? 'manual_override' : undefined,
        })),
      oldItems: originalSnapshot.map(({ qty_per_pack, ...rest }) => ({
        id: rest.id,
        product_id: rest.product_id,
        packing_type_id: rest.packing_type_id || null,
        num_packs: rest.num_packs,
        loose_qty: rest.loose_qty,
        total_qty: rest.total_qty,
        weight_kg: rest.weight_kg,
        remarks: rest.remarks || null,
      })),
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleSave = () => {
    if (negativeStockItems.length > 0) {
      setShowNegativeStockConfirm(true);
    } else {
      doSave();
    }
  };

  if (!dispatch) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Dispatch <span className="font-mono text-sm text-muted-foreground">{dispatch.dispatch_number}</span>
            </DialogTitle>
          </DialogHeader>

          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Client *</Label><ClientSelector value={clientId} onChange={setClientId} /></div>
                <div className="col-span-2 flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
                  <Switch id="edit-third-party" checked={isThirdParty} onCheckedChange={setIsThirdParty} />
                  <Label htmlFor="edit-third-party" className="cursor-pointer">Third Party Dispatch <span className="text-xs text-muted-foreground">(hide company name on challan)</span></Label>
                </div>
                {isThirdParty && (
                  <div className="col-span-2">
                    <Label>Consignee Name *</Label>
                    <ConsigneeSelector
                      clientId={clientId}
                      value={consigneeName}
                      onChange={setConsigneeName}
                      placeholder="Select or add consignee..."
                    />
                  </div>
                )}
                {/* Driver master selector reconnects in Phase 5 */}
                <div><Label>Driver Name</Label><Input value={driverName} onChange={e => setDriverName(e.target.value)} /></div>
                <div><Label>Driver Phone</Label><Input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} /></div>
                <div><Label>Vehicle Number</Label><Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} /></div>
                <div><Label>Dispatch Date *</Label><Input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} /></div>
                <div>
                  <Label>Dispatched By *</Label>
                  {/* Staff master selector reconnects in Phase 5 */}
                  <Input value={dispatchedBy} onChange={e => setDispatchedBy(e.target.value)} placeholder="Staff name" />
                </div>
                <div className="col-span-1"><Label>Remarks</Label><Input value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">Line Items</Label>
                  <Button size="sm" variant="outline" onClick={addItem}><Plus size={14} className="mr-1" /> Add Item</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Pcs/Pack</TableHead>
                      <TableHead className="text-right">Packs</TableHead>
                      <TableHead className="text-right">Loose Packs</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Weight KG</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const autoCalc = isAutoCalc(item);
                      return (
                        <TableRow key={item.id ?? `new-${idx}`}>
                          <TableCell className="min-w-[220px]">
                            <ProductSelector value={item.product_id} onChange={v => updateItem(idx, 'product_id', v)} preferClient={clientId || undefined} />
                          </TableCell>
                          {/* Packing type chips reconnect in Phase 5 */}
                          <TableCell><Input type="number" className="w-20 text-right" value={item.qty_per_pack || ''} onChange={e => updateItem(idx, 'qty_per_pack', Number(e.target.value))} /></TableCell>
                          <TableCell><Input type="number" className="w-20 text-right" value={item.num_packs || ''} onChange={e => updateItem(idx, 'num_packs', Number(e.target.value))} /></TableCell>
                          <TableCell><Input type="number" className="w-20 text-right" value={item.loose_qty || ''} onChange={e => updateItem(idx, 'loose_qty', Number(e.target.value))} /></TableCell>
                          <TableCell>
                            <div className="relative">
                              <Input
                                type="number"
                                className={cn("w-24 text-right", autoCalc && "bg-muted/50 pr-7")}
                                value={item.total_qty || ''}
                                onChange={e => updateItem(idx, 'total_qty', Number(e.target.value))}
                                readOnly={autoCalc}
                              />
                              {autoCalc && <Lock size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.001"
                                className={cn("w-24 text-right", autoCalc && "bg-muted/50 pr-7")}
                                value={item.weight_kg || ''}
                                onChange={e => updateItem(idx, 'weight_kg', Number(e.target.value))}
                                readOnly={autoCalc}
                              />
                              {autoCalc && <Lock size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                            </div>
                          </TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 size={14} /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                    {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No items. Click "Add Item".</TableCell></TableRow>}
                  </TableBody>
                </Table>
                {items.length > 0 && (
                  <div className="flex gap-6 mt-2 text-sm font-medium">
                    <span>Total Packs: {totalCartons}</span>
                    <span>Total Pieces: {totalPieces}</span>
                    <span>Total Weight: {totalWeight.toFixed(3)} KG</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={!clientId || items.length === 0 || updateDispatch.isPending}>
                  {updateDispatch.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNegativeStockConfirm} onOpenChange={setShowNegativeStockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" size={18} />
              Insufficient Stock Warning
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-2">The following increases exceed available stock:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {negativeStockItems.map((item, i) => (
                    <li key={i}>
                      <span className="font-medium">{item.code} - {item.name}</span>
                      : Increase {item.requested}, Available {item.available}
                      <span className="text-destructive font-medium"> (short by {item.shortBy})</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">Stock will go negative. Continue anyway?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
