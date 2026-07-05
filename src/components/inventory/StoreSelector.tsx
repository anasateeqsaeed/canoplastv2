import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Warehouse, Pencil } from "lucide-react";
import { useStores } from "@/hooks/useStores";
import { QuickAddStoreDialog } from "./QuickAddStoreDialog";

interface StoreSelectorProps {
  value: string;
  onChange: (storeId: string) => void;
  label?: string;
  disabled?: boolean;
  showQuickAdd?: boolean;
}

export function StoreSelector({
  value,
  onChange,
  label = "Store / Godown",
  disabled,
  showQuickAdd = true,
}: StoreSelectorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { activeStores, isLoading } = useStores();

  const selectedStore = activeStores.find(s => s.id === value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {showQuickAdd && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Quick Add
          </Button>
        )}
      </div>
      
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select store / godown">
            {selectedStore && (
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                <span>{selectedStore.name}</span>
                {selectedStore.floor_location && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedStore.floor_location})
                  </span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeStores
            .filter((store) => store.id && store.id.trim() !== '')
            .map((store) => (
              <SelectItem key={store.id} value={store.id}>
                <div className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{store.name}</span>
                  {store.floor_location && (
                    <span className="text-xs text-muted-foreground">
                      - {store.floor_location}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {selectedStore?.description && (
        <p className="text-xs text-muted-foreground">{selectedStore.description}</p>
      )}

      <QuickAddStoreDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={(storeId) => {
          onChange(storeId);
          setShowAddDialog(false);
        }}
      />
    </div>
  );
}
