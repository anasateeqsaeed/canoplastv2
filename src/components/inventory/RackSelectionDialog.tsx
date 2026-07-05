import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStoreRacks } from "@/hooks/useStores";
import type { RackAssignment } from "./MultiRackSelector";

interface RackSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  storeName: string;
  excludeIds: string[];
  remainingQuantity: number;
  unit: string;
  onSelect: (assignment: RackAssignment) => void;
}

export function RackSelectionDialog({
  open,
  onOpenChange,
  storeId,
  storeName,
  excludeIds,
  remainingQuantity,
  unit,
  onSelect
}: RackSelectionDialogProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  
  const { racks, isLoading } = useStoreRacks(storeId);

  // Filter racks not already assigned
  const availableLocations = useMemo(() => {
    return racks
      .filter(loc => !excludeIds.includes(loc.id))
      .map(loc => ({
        ...loc,
        availableCapacity: (loc.capacity_kg || 0) - (loc.current_stock_kg || 0)
      }))
      .sort((a, b) => {
        // Sort by location_code numerically if possible
        const aNum = parseInt(a.location_code);
        const bNum = parseInt(b.location_code);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.location_code.localeCompare(b.location_code);
      });
  }, [racks, excludeIds]);

  const selectedLocation = availableLocations.find(loc => loc.id === selectedLocationId);
  const maxQuantity = selectedLocation 
    ? Math.min(selectedLocation.availableCapacity, remainingQuantity)
    : 0;

  const handleSubmit = () => {
    if (!selectedLocation || quantity <= 0) return;

    onSelect({
      locationId: selectedLocation.id,
      locationCode: selectedLocation.location_code,
      locationName: selectedLocation.location_name,
      quantity: quantity,
      capacity: selectedLocation.capacity_kg || 0,
      currentStock: selectedLocation.current_stock_kg || 0
    });

    // Reset and close
    setSelectedLocationId("");
    setQuantity(0);
    onOpenChange(false);
  };

  const handleLocationChange = (locId: string) => {
    setSelectedLocationId(locId);
    const loc = availableLocations.find(l => l.id === locId);
    if (loc) {
      // Auto-fill with remaining quantity or max available
      const autoQty = Math.min(loc.availableCapacity, remainingQuantity);
      setQuantity(autoQty);
    }
  };

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedLocationId("");
      setQuantity(0);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Rack in {storeName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Quantity to assign:</span>
            <span className="font-medium">{remainingQuantity.toFixed(2)} {unit}</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p>Loading racks...</p>
            </div>
          ) : availableLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>No available racks in this store</p>
              <p className="text-xs">Add a new rack location to this store</p>
            </div>
          ) : (
            <ScrollArea className="h-[280px] pr-3">
              <RadioGroup
                value={selectedLocationId}
                onValueChange={handleLocationChange}
                className="space-y-2"
              >
                {availableLocations.map((loc) => {
                  const isFull = loc.availableCapacity <= 0;
                  const utilizationPct = loc.capacity_kg 
                    ? ((loc.current_stock_kg || 0) / loc.capacity_kg) * 100 
                    : 0;
                  
                  return (
                    <label
                      key={loc.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                        selectedLocationId === loc.id && "border-primary bg-primary/5",
                        isFull && "opacity-50 cursor-not-allowed bg-muted"
                      )}
                    >
                      <RadioGroupItem 
                        value={loc.id} 
                        disabled={isFull}
                        id={loc.id}
                      />
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">Rack {loc.location_code}</div>
                        {loc.location_name && loc.location_name !== loc.location_code && (
                          <div className="text-xs text-muted-foreground truncate">
                            {loc.location_name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {isFull ? (
                          <Badge variant="secondary">Full</Badge>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-green-600">
                              {loc.availableCapacity.toFixed(0)} {unit} free
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {utilizationPct.toFixed(0)}% used
                            </div>
                          </>
                        )}
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </ScrollArea>
          )}

          {selectedLocation && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Quantity to assign to Rack {selectedLocation.location_code} ({unit})</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Math.min(parseFloat(e.target.value) || 0, maxQuantity))}
                  min={0}
                  max={maxQuantity}
                  step={0.01}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(maxQuantity)}
                >
                  Max ({maxQuantity.toFixed(0)})
                </Button>
              </div>
              {quantity > selectedLocation.availableCapacity && (
                <p className="text-xs text-destructive">
                  Exceeds available capacity of {selectedLocation.availableCapacity.toFixed(0)} {unit}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedLocation || quantity <= 0}
          >
            Add to Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
