import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateProduct } from '@/hooks/useProducts';
import { ClientSelector } from '@/components/selectors/ClientSelector';

interface QuickAddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (productId: string, product: { selling_price: number; labour_price: number }) => void;
  defaultClientId?: string;
}

export function QuickAddProductDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultClientId,
}: QuickAddProductDialogProps) {
  const createProduct = useCreateProduct();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    client_id: '',
    selling_price: '0',
    labour_price: '0',
    price_unit: 'piece',
    cycle_time: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        code: '',
        name: '',
        client_id: defaultClientId || '',
        selling_price: '0',
        labour_price: '0',
        price_unit: 'piece',
        cycle_time: '',
      });
    }
  }, [open, defaultClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    try {
      const result = await createProduct.mutateAsync({
        code: formData.code.trim(),
        name: formData.name.trim(),
        client_id: formData.client_id || null,
        selling_price: Number(formData.selling_price) || 0,
        labour_price: Number(formData.labour_price) || 0,
        price_unit: formData.price_unit,
        cycle_time: formData.cycle_time ? Number(formData.cycle_time) : null,
        is_active: true,
      });
      onOpenChange(false);
      onSuccess?.(result.id, {
        selling_price: Number(formData.selling_price) || 0,
        labour_price: Number(formData.labour_price) || 0,
      });
    } catch {
      // toast handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Add Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qap-code">Code *</Label>
              <Input
                id="qap-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., PRD-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qap-name">Name *</Label>
              <Input
                id="qap-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product name"
                required
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Customer</Label>
              <ClientSelector
                value={formData.client_id}
                onChange={(v) => setFormData({ ...formData, client_id: v })}
                includeNone
                noneLabel="Own product (no customer)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qap-selling">Selling Price</Label>
              <Input
                id="qap-selling"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qap-labour">Labour Price</Label>
              <Input
                id="qap-labour"
                type="number"
                step="0.01"
                value={formData.labour_price}
                onChange={(e) => setFormData({ ...formData, labour_price: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Price Unit</Label>
              <Select
                value={formData.price_unit}
                onValueChange={(v) => setFormData({ ...formData, price_unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Per Piece</SelectItem>
                  <SelectItem value="kg">Per Kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qap-cycle">Cycle Time (sec)</Label>
              <Input
                id="qap-cycle"
                type="number"
                value={formData.cycle_time}
                onChange={(e) => setFormData({ ...formData, cycle_time: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
              Add Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
