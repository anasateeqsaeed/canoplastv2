import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStores } from "@/hooks/useStores";

interface QuickAddStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (storeId: string) => void;
}

export function QuickAddStoreDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickAddStoreDialogProps) {
  const { createStore } = useStores();
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    floor_location: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) return;
    
    const result = await createStore.mutateAsync({
      code: formData.code.toUpperCase(),
      name: formData.name,
      description: formData.description || undefined,
      floor_location: formData.floor_location || undefined,
    });
    
    setFormData({ code: "", name: "", description: "", floor_location: "" });
    onSuccess?.(result.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Store / Godown</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., RM, FG"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Floor Location</Label>
              <Input
                value={formData.floor_location}
                onChange={(e) => setFormData({ ...formData, floor_location: e.target.value })}
                placeholder="e.g., Ground Floor"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Store Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Raw Material Store"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is stored here?"
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createStore.isPending}>
              {createStore.isPending ? "Adding..." : "Add Store"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
