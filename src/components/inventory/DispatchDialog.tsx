import { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { ConsigneeSelector } from '@/components/selectors/ConsigneeSelector';
import { ProductSelector } from '@/components/selectors/ProductSelector';
// Packing types master + packing configs reconnect in Phase 5

import { useCreateDispatch } from '@/hooks/useDispatches';
import { useProducts } from '@/hooks/useProducts';
import { useProductStockBalances } from '@/hooks/useFinishedGoodsStock';
import { fetchLastAgreedPrices } from '@/hooks/useSales';
// DriverSelector / StaffSelector reconnect in Phase 5 (drivers / staff_members)

interface DispatchLineItem {
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DispatchDialog({ open, onOpenChange }: Props) {
  const [clientId, setClientId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [dispatchedBy, setDispatchedBy] = useState('');
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [consigneeName, setConsigneeName] = useState('');
  const [items, setItems] = useState<DispatchLineItem[]>([]);
  const [showNegativeStockConfirm, setShowNegativeStockConfirm] = useState(false);

  const { data: products = [] } = useProducts();
  const { data: stockBalances } = useProductStockBalances();
  const createDispatch = useCreateDispatch();

  // Map of product_id -> available FG stock (from the ledger)
  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (stockBalances) {
      stockBalances.forEach((bal, pid) => { map[pid] = bal; });
    }
    return map;
  }, [stockBalances]);

  const getProductWeight = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId) as any;
    // Prefer customer-agreed weight on dispatch; fall back to actual moulded weight
    return product?.agreed_weight_per_piece || product?.weight_per_piece || 0;
  }, [products]);

  const recalculate = useCallback((item: DispatchLineItem): DispatchLineItem => {
    const qtyPerPack = item.qty_per_pack || 0;
    if (qtyPerPack > 0) {
      // Loose is treated as additional PACKS (e.g. partial/extra packs of the same product)
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
      const updated: DispatchLineItem = { ...item, [field]: value };
      if (field === 'product_id') {
        // Auto-fill rate from product master (SO / last agreed rate applied async below)
        const p: any = products.find(pp => pp.id === value);
        if (p && !updated.rate_overridden) {
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
    // Prefer the client's last agreed rate (from prior dispatches / SO) when available
    if (field === 'product_id' && value && clientId) {
      fetchLastAgreedPrices(clientId, [value]).then((map) => {
        const lp = map.get(value);
        if (!lp || (lp.selling <= 0 && lp.labour <= 0)) return;
        setItems(prev => prev.map((item, i) => {
          if (i !== idx || item.product_id !== value || item.rate_overridden) return item;
          return { ...item, agreed_selling_price: lp.selling, agreed_labour_price: lp.labour };
        }));
      });
    }
  };

  const isAutoCalc = (item: DispatchLineItem) => (item.qty_per_pack || 0) > 0;

  const totalPieces = items.reduce((s, i) => s + i.total_qty, 0);
  const totalCartons = items.reduce((s, i) => s + i.num_packs, 0);
  const totalWeight = items.reduce((s, i) => s + i.weight_kg, 0);
  const totalSaleValue = items.reduce((s, i) => s + (i.total_qty * (i.agreed_selling_price ?? 0)), 0);

  // Check which items would cause negative stock
  const negativeStockItems = useMemo(() => {
    // Group total requested qty per product across all rows
    const totalByProduct: Record<string, number> = {};
    items.forEach(i => {
      if (i.product_id && i.total_qty > 0) {
        totalByProduct[i.product_id] = (totalByProduct[i.product_id] || 0) + i.total_qty;
      }
    });

    return Object.entries(totalByProduct)
      .filter(([productId, totalRequested]) => {
        const avail = stockMap[productId] ?? 0;
        return totalRequested > avail;
      })
      .map(([productId, totalRequested]) => {
        const product = products.find(p => p.id === productId);
        const avail = stockMap[productId] ?? 0;
        return {
          name: product?.name || 'Unknown',
          code: product?.code || '',
          requested: totalRequested,
          available: avail,
          shortBy: totalRequested - avail,
        };
      });
  }, [items, stockMap, products]);

  const doSave = () => {
    createDispatch.mutate({
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
      items: items.filter(i => i.product_id).map(({ qty_per_pack, rate_overridden, agreed_selling_price, agreed_labour_price, ...rest }) => ({
        ...rest,
        packing_type_id: rest.packing_type_id || null,
        remarks: rest.remarks || null,
        agreed_selling_price: agreed_selling_price ?? null,
        agreed_labour_price: agreed_labour_price ?? null,
        rate_source: rate_overridden ? 'manual_override' : null,
      })),
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setClientId('');
        setItems([]);
        setVehicleNumber('');
        setDriverName('');
        setDriverPhone('');
        setDispatchedBy('');
        setDispatchDate(new Date().toISOString().split('T')[0]);
        setRemarks('');
        setIsThirdParty(false);
        setConsigneeName('');
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Dispatch / Gate Pass</DialogTitle></DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Client *</Label><ClientSelector value={clientId} onChange={setClientId} /></div>
            <div className="col-span-2 flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
              <Switch id="third-party" checked={isThirdParty} onCheckedChange={setIsThirdParty} />
              <Label htmlFor="third-party" className="cursor-pointer">Third Party Dispatch <span className="text-xs text-muted-foreground">(hide company name on challan)</span></Label>
            </div>
            {isThirdParty && (
              <div className="col-span-2">
                <Label>Consignee Name (Customer's Customer) *</Label>
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
                  <TableHead className="text-right">Sale Rate</TableHead>
                  <TableHead className="text-right">Line Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => {
                  const autoCalc = isAutoCalc(item);
                  // Calculate effective available stock by subtracting quantities from other rows with same product
                  const rawStock = item.product_id ? (stockMap[item.product_id] ?? 0) : null;
                  const usedByOtherRows = item.product_id
                    ? items.reduce((sum, otherItem, otherIdx) => {
                        if (otherIdx !== idx && otherItem.product_id === item.product_id) {
                          return sum + (otherItem.total_qty || 0);
                        }
                        return sum;
                      }, 0)
                    : 0;
                  const availStock = rawStock !== null ? rawStock - usedByOtherRows : null;
                  const isShort = availStock !== null && item.total_qty > availStock;
                  const shortBy = isShort ? item.total_qty - (availStock ?? 0) : 0;

                  return (
                    <TableRow key={idx}>
                      <TableCell className="min-w-[220px]">
                        <ProductSelector value={item.product_id} onChange={v => updateItem(idx, 'product_id', v)} preferClient={clientId || undefined} />
                        {item.product_id && (
                          <div className={cn(
                            "text-[11px] mt-0.5 font-medium",
                            availStock === null
                              ? "text-muted-foreground"
                              : isShort
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {availStock === null
                              ? "Stock: N/A"
                              : isShort
                                ? <span className="flex items-center gap-0.5"><AlertTriangle size={10} /> Stock: {availStock} (short by {shortBy})</span>
                                : `Stock: ${availStock}`
                            }
                          </div>
                        )}
                      </TableCell>
                      {/* Packing type chips reconnect in Phase 5 (packing_types) */}
                      <TableCell><Input type="number" className="w-20 text-right" value={item.qty_per_pack || ''} onChange={e => updateItem(idx, 'qty_per_pack', Number(e.target.value))} placeholder="e.g. 50" /></TableCell>
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
                      <TableCell>
                        <Input
                          type="number"
                          step="0.0001"
                          className={cn("w-24 text-right", item.rate_overridden && "border-amber-500")}
                          value={item.agreed_selling_price ?? ''}
                          onChange={e => updateItem(idx, 'agreed_selling_price', e.target.value === '' ? null : Number(e.target.value))}
                          title={item.rate_overridden ? 'Manually overridden for this dispatch' : 'Default from product / last agreed rate'}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-medium">
                        {((item.agreed_selling_price ?? 0) * item.total_qty).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 size={14} /></Button></TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Click "Add Item" to start</TableCell></TableRow>}
              </TableBody>
            </Table>
            {items.length > 0 && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm font-medium">
                <span>Total Packs: {totalCartons}</span>
                <span>Total Pieces: {totalPieces}</span>
                <span>Total Weight: {totalWeight.toFixed(3)} KG</span>
                <span className="text-emerald-600 dark:text-emerald-400">Sale Value: Rs {totalSaleValue.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!clientId || !dispatchedBy || items.length === 0 || createDispatch.isPending}>Create Dispatch</Button>
          </DialogFooter>
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
                <p className="mb-2">The following items exceed available stock:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {negativeStockItems.map((item, i) => (
                    <li key={i}>
                      <span className="font-medium">{item.code} - {item.name}</span>
                      : Requested {item.requested}, Available {item.available}
                      <span className="text-destructive font-medium"> (short by {item.shortBy})</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">Stock will go negative for these items. Continue anyway?</p>
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
