import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, X, AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RackAssignment {
  locationId: string;
  locationCode: string;
  locationName: string;
  quantity: number;
  capacity: number;
  currentStock: number;
}

interface MultiRackSelectorProps {
  totalQuantity: number;
  unit: string;
  assignments: RackAssignment[];
  onAssignmentsChange: (assignments: RackAssignment[]) => void;
  onAddRack: () => void;
  isOnHold: boolean;
  onHoldChange: (hold: boolean) => void;
  disabled?: boolean;
  selectedStoreId: string;
  selectedStoreName?: string;
}

export function MultiRackSelector({
  totalQuantity,
  unit,
  assignments,
  onAssignmentsChange,
  onAddRack,
  isOnHold,
  onHoldChange,
  disabled,
  selectedStoreId,
  selectedStoreName
}: MultiRackSelectorProps) {
  const totalAssigned = assignments.reduce((sum, a) => sum + a.quantity, 0);
  const pending = Math.max(0, totalQuantity - totalAssigned);
  const isOverAssigned = totalAssigned > totalQuantity;

  const handleQuantityChange = (index: number, newQty: number) => {
    const updated = [...assignments];
    const assignment = updated[index];
    const availableCapacity = assignment.capacity - assignment.currentStock;
    
    // Cap at available capacity
    updated[index] = {
      ...assignment,
      quantity: Math.min(Math.max(0, newQty), availableCapacity)
    };
    onAssignmentsChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = assignments.filter((_, i) => i !== index);
    onAssignmentsChange(updated);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Rack Assignment</Label>
        {totalQuantity > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span>Total: <strong>{totalQuantity} {unit}</strong></span>
            <span className="text-green-600">Assigned: <strong>{totalAssigned.toFixed(2)} {unit}</strong></span>
            {pending > 0 && !isOnHold && (
              <span className="text-amber-600">Pending: <strong>{pending.toFixed(2)} {unit}</strong></span>
            )}
            {isOverAssigned && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over-assigned
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Selected Racks List */}
      {assignments.length > 0 && (
        <div className="space-y-2">
          {assignments.map((assignment, index) => {
            const availableCapacity = assignment.capacity - assignment.currentStock;
            const isOverCapacity = assignment.quantity > availableCapacity;
            
            return (
              <div
                key={assignment.locationId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-md border bg-background",
                  isOverCapacity && "border-destructive bg-destructive/5"
                )}
              >
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">Rack {assignment.locationCode}</div>
                  {assignment.locationName && assignment.locationName !== assignment.locationCode && (
                    <div className="text-xs text-muted-foreground truncate">
                      {assignment.locationName}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={assignment.quantity || ''}
                    onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                    className="w-24 text-right"
                    min={0}
                    max={availableCapacity}
                    step={0.01}
                    disabled={disabled}
                  />
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </div>
                <div className="text-xs text-muted-foreground w-32 text-right">
                  Avail: {availableCapacity.toFixed(0)} / {assignment.capacity.toFixed(0)} {unit}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Rack Button */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddRack}
          disabled={disabled || !selectedStoreId || isOnHold}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Rack
        </Button>
        {!selectedStoreId && (
          <span className="text-xs text-muted-foreground">Select a store first</span>
        )}
        {selectedStoreId && selectedStoreName && (
          <span className="text-xs text-muted-foreground">
            Adding racks from: {selectedStoreName}
          </span>
        )}
      </div>

      {/* Hold Checkbox */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Checkbox
          id="hold-material"
          checked={isOnHold}
          onCheckedChange={(checked) => onHoldChange(!!checked)}
          disabled={disabled}
        />
        <div className="flex-1">
          <Label htmlFor="hold-material" className="text-sm font-normal cursor-pointer">
            Put on Hold (no suitable storage available)
          </Label>
          <p className="text-xs text-muted-foreground">
            Material will be marked for later put-away
          </p>
        </div>
      </div>
    </div>
  );
}
