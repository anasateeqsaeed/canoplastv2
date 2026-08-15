import { useState, useMemo } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Button } from '@/components/ui/button';
import { RefreshButton } from '@/components/layout/RefreshButton';
import { useRawMaterialStock, RawMaterialStockSummary } from '@/hooks/useRawMaterialStock';
// Historical as-of stock (useHistoricalRawMaterialStock / StockAsOfBar) reconnects in Phase 5
import { StockAdjustmentDialog } from '@/components/inventory/StockAdjustmentDialog';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
  Package,
  Boxes,
  AlertTriangle,
  ChevronDown,
  Loader2,
  TrendingUp,
  TrendingDown,
  Settings2,
} from 'lucide-react';
import { format } from 'date-fns';

export default function RawMaterialStock() {
  const { data: stockSummary = [], isLoading } = useRawMaterialStock();
  const { isAdmin } = useAuth();
  const admin = isAdmin();
  const [search, setSearch] = usePersistedState('raw-material-stock.search', '');
  const [typeFilter, setTypeFilter] = usePersistedState<string>('raw-material-stock.type', 'all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [adjustItem, setAdjustItem] = useState<RawMaterialStockSummary | null>(null);

  // Extract unique material types for filter
  const materialTypes = useMemo(() => {
    const types = new Set<string>();
    stockSummary.forEach((s) => {
      if (s.material_type) types.add(s.material_type);
    });
    return Array.from(types).sort();
  }, [stockSummary]);

  // Filter data
  const filteredData = useMemo(() => {
    return stockSummary.filter((item) => {
      const matchesSearch =
        item.material_name.toLowerCase().includes(search.toLowerCase()) ||
        item.material_code.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || item.material_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [stockSummary, search, typeFilter]);

  // Stats
  const totalMaterials = stockSummary.length;
  const totalStock = stockSummary.reduce((sum, s) => sum + s.total_stock, 0);
  const lowStockCount = stockSummary.filter(
    (s) => s.min_stock && s.total_stock < s.min_stock
  ).length;

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusBadge = (item: RawMaterialStockSummary) => {
    if (item.min_stock && item.total_stock < item.min_stock) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle size={12} />
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-success border-success/50">
        OK
      </Badge>
    );
  };

  return (
    <MainLayout
      title="Raw Material Stock"
      subtitle="Summary of raw material inventory by material"
     
    >
      <div className="space-y-6">
        {/* Stock "as of" date bar reconnects in Phase 5 (needs production usage history) */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{totalMaterials}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">
                  {totalStock.toLocaleString()} kg
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {lowStockCount > 0 ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <span className="text-2xl font-bold text-destructive">
                      {lowStockCount}
                    </span>
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
              placeholder="Search by material name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {materialTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
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
                <TableHead>Material</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Lots</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No raw materials with stock found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const isExpanded = expandedRows.has(item.material_id);
                  const isLow = item.min_stock && item.total_stock < item.min_stock;

                  return (
                    <Collapsible key={item.material_id} open={isExpanded} asChild>
                      <>
                        <TableRow className={isLow ? 'bg-destructive/5' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.material_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {item.material_code}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {item.material_type || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{item.lot_count}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-lg">
                              {item.total_stock.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground ml-1 text-sm">
                              {item.unit}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(item)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRowExpand(item.material_id)}
                                  className="gap-1 h-8"
                                >
                                  <Package size={14} />
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                </Button>
                              </CollapsibleTrigger>
                              {admin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  title="Adjust closing stock"
                                  onClick={() => setAdjustItem(item)}
                                >
                                  <Settings2 size={14} />
                                </Button>
                              )}
                            </div>
                          </TableCell>

                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={6} className="p-4">
                              <div className="text-sm font-medium mb-2">
                                Lot Details ({item.lot_count} lots)
                              </div>
                              <div className="border rounded-lg overflow-hidden overflow-x-auto bg-background">
                                <Table className="min-w-[600px]">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Lot Number</TableHead>
                                      <TableHead>Receipt Date</TableHead>
                                      <TableHead>Supplier</TableHead>
                                      <TableHead className="text-right">Remaining</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Location</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {item.lots.map((lot) => (
                                      <TableRow key={lot.id}>
                                        <TableCell className="font-mono text-sm">
                                          {lot.lot_number}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                          {format(new Date(lot.received_date), 'dd/MM/yy')}
                                        </TableCell>
                                        <TableCell>
                                          {lot.supplier?.name || '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {lot.remaining_qty.toLocaleString()} {lot.unit}
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant={lot.inspection_status === 'passed' ? 'default' : 'secondary'}
                                            className="text-xs capitalize"
                                          >
                                            {lot.inspection_status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                          {lot.storage_location?.location_code || '-'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
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
      {adjustItem && (
        <StockAdjustmentDialog
          open={!!adjustItem}
          onOpenChange={(o) => !o && setAdjustItem(null)}
          scope="raw_material"
          itemId={adjustItem.material_id}
          itemCode={adjustItem.material_code}
          itemName={adjustItem.material_name}
          currentQty={adjustItem.total_stock}
        />
      )}
    </MainLayout>

  );
}
