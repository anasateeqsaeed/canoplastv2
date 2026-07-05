import { useEffect, useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { ProductSelector } from '@/components/selectors/ProductSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, UserPlus, PackagePlus } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import {
  useUpsertQuotation,
  fetchLastAgreedPrices,
  type Quotation,
} from '@/hooks/useSales';
import { QuickAddClientDialog } from '@/components/masters/QuickAddClientDialog';
import { QuickAddProductDialog } from '@/components/masters/QuickAddProductDialog';

interface Line {
  product_id: string;
  qty: number;
  selling_price: number;
  labour_price: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quotation?: Quotation | null;
}

export function QuotationDialog({ open, onOpenChange, quotation }: Props) {
  const { data: products = [] } = useProducts();
  const upsert = useUpsertQuotation();

  const [clientId, setClientId] = useState('');
  const [quoteDate, setQuoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [validUntil, setValidUntil] = useState('');
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [quickAddClient, setQuickAddClient] = useState(false);
  const [quickAddProduct, setQuickAddProduct] = useState<{ open: boolean; rowIndex: number | null }>({ open: false, rowIndex: null });

  // Price Calculator sheet + draft picker reconnect in Phase 6 (price_calculations)

  useEffect(() => {
    if (open) {
      if (quotation) {
        setClientId(quotation.client_id);
        setQuoteDate(quotation.quote_date);
        setValidUntil(quotation.valid_until || '');
        setTaxPercent(Number(quotation.tax_percent || 0));
        setNotes(quotation.notes || '');
        setLines(
          (quotation.quotation_items || []).map((it) => ({
            product_id: it.product_id,
            qty: Number(it.qty),
            selling_price: Number(it.selling_price),
            labour_price: Number(it.labour_price),
          })),
        );
      } else {
        setClientId('');
        setQuoteDate(format(new Date(), 'yyyy-MM-dd'));
        setValidUntil('');
        setTaxPercent(0);
        setNotes('');
        setLines([]);
      }
    }
  }, [open, quotation]);

  const addLine = () =>
    setLines((l) => [...l, { product_id: '', qty: 1, selling_price: 0, labour_price: 0 }]);

  const updateLine = async (idx: number, patch: Partial<Line>) => {
    const next = lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    // when product changes, prefill prices
    if (patch.product_id && patch.product_id !== lines[idx].product_id) {
      const p = products.find((pr: any) => pr.id === patch.product_id) as any;
      let selling = Number(p?.selling_price || 0);
      let labour = Number(p?.labour_price || 0);
      if (clientId) {
        const last = await fetchLastAgreedPrices(clientId, [patch.product_id]);
        const lp = last.get(patch.product_id);
        if (lp && (lp.selling > 0 || lp.labour > 0)) {
          selling = lp.selling;
          labour = lp.labour;
        }
      }
      next[idx] = { ...next[idx], selling_price: selling, labour_price: labour };
    }
    setLines(next);
  };

  const removeLine = (idx: number) => setLines((l) => l.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((s, l) => s + l.qty * l.selling_price, 0);
  const tax = (subtotal * taxPercent) / 100;
  const total = subtotal + tax;

  const canSave = clientId && lines.length > 0 && lines.every((l) => l.product_id && l.qty > 0);

  const onSave = async () => {
    await upsert.mutateAsync({
      id: quotation?.id,
      client_id: clientId,
      quote_date: quoteDate,
      valid_until: validUntil || null,
      tax_percent: taxPercent,
      notes: notes || null,
      items: lines,
    });
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quotation ? `Edit ${quotation.quote_number}` : 'New Quotation'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Label>Customer *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ClientSelector value={clientId} onChange={setClientId} />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickAddClient(true)}
                >
                  <UserPlus size={14} className="mr-1" /> New
                </Button>
              </div>
            </div>
            <div>
              <Label>Quote Date *</Label>
              <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
            </div>
            <div>
              <Label>Valid Until</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus size={14} className="mr-1" /> Add line
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto border rounded">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="text-right">Labour</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No items
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((l, i) => {
                      const lineTotal = l.qty * l.selling_price;
                      const materialPortion = l.qty * Math.max(0, l.selling_price - l.labour_price);
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex gap-1">
                              <div className="flex-1 min-w-0">
                                <ProductSelector
                                  value={l.product_id}
                                  onChange={(v) => updateLine(i, { product_id: v })}
                                  preferClient={clientId}
                                />
                              </div>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                title="Quick add product"
                                onClick={() => setQuickAddProduct({ open: true, rowIndex: i })}
                              >
                                <PackagePlus size={14} />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-24 text-right"
                              value={l.qty}
                              onChange={(e) => updateLine(i, { qty: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              className="w-28 text-right"
                              value={l.selling_price}
                              onChange={(e) => updateLine(i, { selling_price: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              className="w-28 text-right"
                              value={l.labour_price}
                              onChange={(e) => updateLine(i, { labour_price: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <div>{formatCurrency(lineTotal, { compact: false, decimals: 2 })}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Material: {formatCurrency(materialPortion, { compact: false, decimals: 2 })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => removeLine(i)}>
                              <Trash2 size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, { compact: false, decimals: 2 })}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Tax %</span>
                <Input
                  type="number"
                  className="w-24 text-right"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(tax, { compact: false, decimals: 2 })}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total, { compact: false, decimals: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!canSave || upsert.isPending}>
            {upsert.isPending ? 'Saving…' : 'Save Quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <QuickAddClientDialog
      open={quickAddClient}
      onOpenChange={setQuickAddClient}
      onSuccess={(newClientId) => setClientId(newClientId)}
    />
    <QuickAddProductDialog
      open={quickAddProduct.open}
      onOpenChange={(o) => setQuickAddProduct((p) => ({ ...p, open: o }))}
      defaultClientId={clientId || undefined}
      onSuccess={(newProductId, prod) => {
        const idx = quickAddProduct.rowIndex;
        if (idx == null) return;
        setLines((prev) =>
          prev.map((row, i) =>
            i === idx
              ? { ...row, product_id: newProductId, selling_price: prod.selling_price, labour_price: prod.labour_price }
              : row,
          ),
        );
      }}
    />
    </>
  );
}
