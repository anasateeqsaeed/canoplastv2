import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableComboBox } from '@/components/ui/searchable-combobox';
import { useStores, useStoreRacks } from '@/hooks/useStores';
import { useMoveStock } from '@/hooks/useMaterialLots';
import { ArrowRight, Package } from 'lucide-react';

// Simplified type for lots passed from rack stock panel
export interface RackLot {
  id: string;
  lot_number: string;
  remaining_qty: number;
  received_date: string;
  grn_number: string | null;
  material: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface MoveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: RackLot | null;
  currentRackId: string;
  currentRackName: string;
}

const MOVE_REASONS = [
  { value: 'reorganization', label: 'Reorganization' },
  { value: 'space_optimization', label: 'Space Optimization' },
  { value: 'damage_prevention', label: 'Damage Prevention' },
  { value: 'fifo_adjustment', label: 'FIFO Adjustment' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'other', label: 'Other' },
];

export function MoveStockDialog({
  open,
  onOpenChange,
  lot,
  currentRackId,
  currentRackName,
}: MoveStockDialogProps) {
  const { stores } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedRackId, setSelectedRackId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  
  const { racks, isLoading: racksLoading } = useStoreRacks(selectedStoreId || undefined);
  const moveStock = useMoveStock();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedStoreId('');
      setSelectedRackId('');
      setReason('');
    }
  }, [open]);

  // Reset rack when store changes
  useEffect(() => {
    setSelectedRackId('');
  }, [selectedStoreId]);

  const handleMove = async () => {
    if (!lot || !selectedRackId) return;

    await moveStock.mutateAsync({
      lotId: lot.id,
      newLocationId: selectedRackId,
      reason: reason || undefined,
    });

    onOpenChange(false);
  };

  const storeOptions = stores.map((s) => ({
    value: s.id,
    label: s.code,
    description: s.name,
  }));

  const rackOptions = racks
    .filter((r) => r.id !== currentRackId) // Exclude current rack
    .map((r) => {
      const available = (r.capacity_kg || 0) - (r.current_stock_kg || 0);
      const lotQty = lot?.remaining_qty || 0;
      const hasCapacity = available >= lotQty;
      return {
        value: r.id,
        label: r.location_code,
        description: `Available: ${available.toLocaleString()} kg${!hasCapacity ? ' ⚠️ Low capacity' : ''}`,
        disabled: false, // Allow selection even if low capacity (show warning)
      };
    });

  if (!lot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Move Material to Another Rack
          </DialogTitle>
          <DialogDescription>
            Transfer this material lot to a different storage location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Lot Info */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <p className="text-sm font-medium">Lot: {lot.lot_number}</p>
            <p className="text-sm text-muted-foreground">
              {lot.material?.name || 'Unknown Material'} ({(lot.remaining_qty || 0).toLocaleString()} kg)
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Current Rack: <span className="font-medium">{currentRackName}</span>
            </p>
          </div>

          {/* Arrow indicator */}
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Destination Store */}
          <div className="space-y-2">
            <Label htmlFor="dest-store">Destination Store</Label>
            <SearchableComboBox
              options={storeOptions}
              value={selectedStoreId}
              onChange={setSelectedStoreId}
              placeholder="Select store..."
              searchPlaceholder="Search stores..."
              emptyMessage="No stores found"
            />
          </div>

          {/* Destination Rack */}
          <div className="space-y-2">
            <Label htmlFor="dest-rack">Destination Rack</Label>
            <SearchableComboBox
              options={rackOptions}
              value={selectedRackId}
              onChange={setSelectedRackId}
              placeholder={selectedStoreId ? 'Select rack...' : 'Select a store first'}
              searchPlaceholder="Search racks..."
              emptyMessage={racksLoading ? 'Loading...' : 'No available racks'}
              disabled={!selectedStoreId}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Move (Optional)</Label>
            <SearchableComboBox
              options={MOVE_REASONS}
              value={reason}
              onChange={setReason}
              placeholder="Select reason..."
              searchPlaceholder="Search reasons..."
              emptyMessage="No reasons found"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedRackId || moveStock.isPending}
          >
            {moveStock.isPending ? 'Moving...' : 'Move Material'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
