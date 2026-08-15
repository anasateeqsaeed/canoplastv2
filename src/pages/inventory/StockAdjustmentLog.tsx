import { useMemo, useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Download, Loader2, ShieldAlert, PlusCircle, Pencil, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  useStockAdjustmentLog,
  useDeleteStockAdjustment,
  useUpdateStockAdjustment,
  type StockAdjustmentLogRow,
} from '@/hooks/useStockAdjustment';
import { useAuth } from '@/hooks/useAuth';
// ProductSelector / useProducts reconnect in Phase 3
import { useMaterials } from '@/hooks/useMaterials';
import { SearchableComboBox } from '@/components/ui/searchable-combobox';
import { StockAdjustmentDialog } from '@/components/inventory/StockAdjustmentDialog';
import type { AdjustmentScope } from '@/hooks/useStockAdjustment';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SCOPE_LABEL: Record<string, string> = {
  finished_good: 'Finished Good',
  raw_material: 'Raw Material',
  component: 'Component',
};

export default function StockAdjustmentLog() {
  const { isAdmin } = useAuth();
  const admin = isAdmin();
  const { data = [], isLoading } = useStockAdjustmentLog();
  const [search, setSearch] = usePersistedState('stock-adjustment-log.search', '');
  const [scope, setScope] = usePersistedState<string>('stock-adjustment-log.scope', 'all');

  // Opening-balance launcher state (FG/component scopes reconnect in Phase 3/5)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openingScope, setOpeningScope] = useState<AdjustmentScope>('raw_material');
  const [pickedItemId, setPickedItemId] = useState('');
  const [pickedItemCode, setPickedItemCode] = useState<string | null>(null);
  const [pickedItemName, setPickedItemName] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  // Edit / delete state
  const [editRow, setEditRow] = useState<StockAdjustmentLogRow | null>(null);
  const [editAsOf, setEditAsOf] = useState<Date>(new Date());
  const [editQty, setEditQty] = useState<string>('0');
  const [editReason, setEditReason] = useState('');
  const [deleteRow, setDeleteRow] = useState<StockAdjustmentLogRow | null>(null);
  const updateMut = useUpdateStockAdjustment();
  const deleteMut = useDeleteStockAdjustment();

  const openEdit = (r: StockAdjustmentLogRow) => {
    setEditRow(r);
    setEditAsOf(new Date(r.as_of_date));
    setEditQty(String(r.after_qty));
    // Strip leading "[...] " tag from stored remarks/reason if present.
    setEditReason((r.reason ?? '').replace(/^\[[^\]]+\]\s*/, '').replace(/^Opening balance:\s*/i, ''));
  };

  const submitEdit = async () => {
    if (!editRow) return;
    await updateMut.mutateAsync({
      row: editRow,
      as_of_date: editAsOf,
      after_qty: Number(editQty || 0),
      reason: editReason.trim(),
    });
    setEditRow(null);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    await deleteMut.mutateAsync(deleteRow);
    setDeleteRow(null);
  };

  const { data: materials = [] } = useMaterials();

  const materialOptions = useMemo(
    () =>
      materials.map((m: any) => ({
        value: m.id,
        label: m.code ?? m.name,
        description: m.name,
      })),
    [materials],
  );

  // handleProductPick reconnects in Phase 3 (products table)

  const handleMaterialPick = (id: string) => {
    setPickedItemId(id);
    const m = materials.find((x: any) => x.id === id);
    setPickedItemCode(m?.code ?? null);
    setPickedItemName(m?.name ?? null);
  };

  const launchAdjust = () => {
    if (!pickedItemId) return;
    setPickerOpen(false);
    setAdjustOpen(true);
  };

  const rows = useMemo(() => {
    return data.filter((r) => {
      if (scope !== 'all' && r.scope !== scope) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (r.item_name ?? '').toLowerCase().includes(q) ||
        (r.item_code ?? '').toLowerCase().includes(q) ||
        (r.reason ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, scope, search]);

  const exportCSV = () => {
    const header = [
      'Adjusted At',
      'Scope',
      'Item Code',
      'Item Name',
      'As-Of',
      'Before',
      'After',
      'Delta',
      'Reason',
    ];
    const lines = [header.join(',')].concat(
      rows.map((r) =>
        [
          format(new Date(r.adjusted_at), 'yyyy-MM-dd HH:mm'),
          SCOPE_LABEL[r.scope] ?? r.scope,
          r.item_code ?? '',
          (r.item_name ?? '').replace(/,/g, ' '),
          r.as_of_date,
          r.before_qty,
          r.after_qty,
          r.delta,
          (r.reason ?? '').replace(/,/g, ' ').replace(/\n/g, ' '),
        ].join(','),
      ),
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-adjustments-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!admin) {
    return (
      <MainLayout title="Stock Adjustment Log" subtitle="Immutable audit of closing-stock corrections">
        <div className="flex items-center gap-2 p-6 border rounded-lg text-muted-foreground">
          <ShieldAlert className="h-5 w-5" />
          Admin access required.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Stock Adjustment Log"
      subtitle="Immutable audit of admin closing-stock corrections"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setOpeningScope('raw_material');
              setPickedItemId('');
              setPickedItemCode(null);
              setPickedItemName(null);
              setPickerOpen(true);
            }}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Set Opening Balance
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search item or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scopes</SelectItem>
              <SelectItem value="finished_good">Finished Good</SelectItem>
              <SelectItem value="raw_material">Raw Material</SelectItem>
              <SelectItem value="component">Component</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>Adjusted At</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>As-Of</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead className="text-right">Delta</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>

            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No adjustments recorded.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {format(new Date(r.adjusted_at), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{SCOPE_LABEL[r.scope] ?? r.scope}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.item_name ?? '-'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.item_code}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.as_of_date}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(r.before_qty).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(r.after_qty).toLocaleString()}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-semibold ${
                        Number(r.delta) > 0
                          ? 'text-success'
                          : Number(r.delta) < 0
                            ? 'text-destructive'
                            : ''
                      }`}
                    >
                      {Number(r.delta) > 0 ? '+' : ''}
                      {Number(r.delta).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">{r.reason}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(r)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteRow(r)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}

            </TableBody>
          </Table>
        </div>
      </div>

      {/* Item picker for opening balance */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Opening Balance</DialogTitle>
            <DialogDescription>
              Pick an item to post a back-dated opening quantity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Stock type</Label>
              <Select
                value={openingScope}
                onValueChange={(v) => {
                  setOpeningScope(v as AdjustmentScope);
                  setPickedItemId('');
                  setPickedItemCode(null);
                  setPickedItemName(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Finished Good / Component scopes reconnect in Phase 3/5 */}
                  <SelectItem value="raw_material">Raw Material</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Item</Label>
              <SearchableComboBox
                value={pickedItemId}
                onChange={handleMaterialPick}
                options={materialOptions}
                placeholder="Select material…"
                searchPlaceholder="Search by code or name…"
                emptyMessage="No materials found"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={launchAdjust} disabled={!pickedItemId}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pickedItemId && (
        <StockAdjustmentDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          scope={openingScope}
          itemId={pickedItemId}
          itemCode={pickedItemCode}
          itemName={pickedItemName}
          currentQty={0}
          defaultMode="opening"
        />
      )}

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Adjustment</DialogTitle>
            <DialogDescription>
              {editRow?.item_name ?? editRow?.item_id}
              {editRow?.item_code ? ` (${editRow.item_code})` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>As-of date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(editAsOf, 'dd MMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editAsOf}
                    onSelect={(d) => d && setEditAsOf(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Before</Label>
                <div className="h-10 flex items-center px-3 border rounded-md bg-muted/40 font-mono">
                  {Number(editRow?.before_qty ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <Label>After qty</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitEdit}
              disabled={!editReason.trim() || updateMut.isPending}
            >
              {updateMut.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the {Number(deleteRow?.delta ?? 0).toLocaleString()} unit
              adjustment for <span className="font-medium">{deleteRow?.item_name}</span> on{' '}
              {deleteRow?.as_of_date}. The linked adjustment lot will also be removed.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
