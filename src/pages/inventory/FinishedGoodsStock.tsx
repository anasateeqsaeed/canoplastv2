import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useFinishedGoodsStock,
  useProductStockTransactions,
  useCreateStockAdjustment,
  FinishedGoodsStockSummary,
} from '@/hooks/useFinishedGoodsStock';
import { useProducts } from '@/hooks/useProducts';
import { ProductSelector } from '@/components/selectors/ProductSelector';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import {
  Search,
  Package,
  Boxes,
  AlertTriangle,
  ChevronDown,
  Loader2,
  TrendingUp,
  PackageCheck,
  Settings2,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';

// Phase 3: balances derive from the stock_transactions ledger.
// Production-lot detail (open/hold lots, machines) reconnects in Phase 5.

function TxnHistory({ productId }: { productId: string }) {
  const { data: txns = [], isLoading } = useProductStockTransactions(productId);
  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto bg-background">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Balance After</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
          ) : txns.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No transactions</TableCell></TableRow>
          ) : txns.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-muted-foreground">{format(new Date(t.created_at), 'dd/MM/yy HH:mm')}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs capitalize">{t.transaction_type.replace(/_/g, ' ')}</Badge>
              </TableCell>
              <TableCell className={`text-right font-mono ${Number(t.quantity) < 0 ? 'text-destructive' : 'text-success'}`}>
                {Number(t.quantity) > 0 ? '+' : ''}{Number(t.quantity).toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono">{Number(t.balance_after).toLocaleString()}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{t.remarks || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface AdjustState {
  product_id: string;
  product_label: string;
  current: number;
}

function AdjustmentDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preset: AdjustState | null;
}) {
  const adjust = useCreateStockAdjustment();
  const { data: products = [] } = useProducts();
  const [productId, setProductId] = useState('');
  const [mode, setMode] = useState<'set' | 'delta'>('set');
  const [type, setType] = useState<'adjustment' | 'opening_balance'>('adjustment');
  const [value, setValue] = useState('');
  const [remarks, setRemarks] = useState('');

  // Sync preset when dialog opens for a specific product
  const effectiveProductId = preset?.product_id || productId;

  const onSubmit = async () => {
    if (!effectiveProductId || value === '') return;
    await adjust.mutateAsync({
      product_id: effectiveProductId,
      mode,
      value: Number(value),
      type,
      remarks: remarks || undefined,
    });
    onOpenChange(false);
    setProductId('');
    setValue('');
    setRemarks('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{preset ? `Adjust Stock — ${preset.product_label}` : 'Manual Stock Entry'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!preset && (
            <div>
              <Label>Product *</Label>
              <ProductSelector value={productId} onChange={setProductId} />
            </div>
          )}
          {preset && (
            <p className="text-sm text-muted-foreground">Current balance: <span className="font-mono font-medium">{preset.current.toLocaleString()}</span></p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Entry Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="opening_balance">Opening Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set closing qty</SelectItem>
                  <SelectItem value="delta">Add / subtract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{mode === 'set' ? 'New Closing Quantity *' : 'Change (+/-) *'}</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === 'set' ? 'e.g. 1200' : 'e.g. -50 or 200'} />
          </div>
          <div>
            <Label>Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Physical count correction" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={adjust.isPending || !effectiveProductId || value === ''}>
            {adjust.isPending ? 'Saving…' : 'Post Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FinishedGoodsStock() {
  const { data: stockSummary = [], isLoading } = useFinishedGoodsStock();
  const { isAdmin } = useAuth();
  const { can } = useMyPermissions();
  const admin = isAdmin();
  const canAdjust = admin || can('inventory', 'edit');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPreset, setAdjustPreset] = useState<AdjustState | null>(null);

  // Extract unique clients for filter
  const clients = useMemo(() => {
    const clientMap = new Map<string, string>();
    stockSummary.forEach((s) => {
      if (s.client_id && s.client_name) {
        clientMap.set(s.client_id, s.client_name);
      }
    });
    return Array.from(clientMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [stockSummary]);

  // Filter data
  const filteredData = useMemo(() => {
    return stockSummary.filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(search.toLowerCase()) ||
        item.product_code.toLowerCase().includes(search.toLowerCase()) ||
        (item.client_name || '').toLowerCase().includes(search.toLowerCase());
      const matchesClient = clientFilter === 'all' || item.client_id === clientFilter;
      return matchesSearch && matchesClient;
    });
  }, [stockSummary, search, clientFilter]);

  // Stats
  const totalProducts = stockSummary.length;
  const totalQty = stockSummary.reduce((sum, s) => sum + Math.max(0, s.balance), 0);
  const negativeCount = stockSummary.filter((s) => s.balance < 0).length;

  const toggleRowExpand = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const openAdjust = (item: FinishedGoodsStockSummary | null) => {
    setAdjustPreset(
      item
        ? { product_id: item.product_id, product_label: `${item.product_code} — ${item.product_name}`, current: item.balance }
        : null,
    );
    setAdjustOpen(true);
  };

  return (
    <MainLayout
      title="Finished Goods Stock"
      subtitle="FG balances derived from the stock ledger"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          {canAdjust && (
            <Button onClick={() => openAdjust(null)}>
              <Plus size={16} className="mr-1" /> Manual Entry
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Products In Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{totalProducts}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total On-Hand Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">
                  {totalQty.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Negative Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {negativeCount > 0 ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span className="text-2xl font-bold text-warning">{negativeCount}</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5 text-success" />
                    <span className="text-2xl font-bold text-success">0</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stock Table */}
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product / Client</TableHead>
                <TableHead className="text-center">Entries</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Last Movement</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No finished goods ledger entries yet. Use "Manual Entry" to post opening balances.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const rowKey = item.product_id;
                  const isExpanded = expandedRows.has(rowKey);
                  const isNegative = item.balance < 0;

                  return (
                    <Collapsible key={rowKey} open={isExpanded} asChild>
                      <>
                        <TableRow className={isNegative ? 'bg-warning/5' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {item.product_code}
                              </p>
                              {item.client_name && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {item.client_name}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{item.txn_count}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold text-lg ${isNegative ? 'text-warning' : 'text-success'}`}>
                              {item.balance.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.last_txn_at ? format(new Date(item.last_txn_at), 'dd/MM/yy HH:mm') : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRowExpand(rowKey)}
                                  className="gap-1 h-8"
                                >
                                  <Package size={14} />
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                </Button>
                              </CollapsibleTrigger>
                              {canAdjust && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  title="Adjust closing stock"
                                  onClick={() => openAdjust(item)}
                                >
                                  <Settings2 size={14} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={5} className="p-4">
                              <div className="text-sm font-medium mb-2">
                                Recent Ledger Entries
                              </div>
                              {isExpanded && <TxnHistory productId={item.product_id} />}
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AdjustmentDialog
        open={adjustOpen}
        onOpenChange={(o) => { setAdjustOpen(o); if (!o) setAdjustPreset(null); }}
        preset={adjustPreset}
      />
    </MainLayout>
  );
}
