import { useState } from 'react';
import { useCreateSupplier } from '@/hooks/useSuppliers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';

interface QuickAddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (supplierId: string) => void;
}

export function QuickAddSupplierDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickAddSupplierDialogProps) {
  const createSupplier = useCreateSupplier();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    supplier_type: 'vendor' as 'vendor' | 'job_work' | 'cash_purchase' | 'customer_provided',
    contact_person: '',
    phone: '',
    email: '',
    gst_number: '',
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      supplier_type: 'vendor',
      contact_person: '',
      phone: '',
      email: '',
      gst_number: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      return;
    }

    try {
      const newSupplier = await createSupplier.mutateAsync({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        supplier_type: formData.supplier_type,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        gst_number: formData.gst_number || null,
        is_active: true,
      });

      onSuccess?.(newSupplier.id);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating supplier:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Quick Add Supplier
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-code">Code *</Label>
              <Input
                id="supplier-code"
                placeholder="e.g. RIL, IOCL"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-type">Type</Label>
              <Select
                value={formData.supplier_type}
                onValueChange={(value: 'vendor' | 'job_work' | 'cash_purchase' | 'customer_provided') => 
                  setFormData({ ...formData, supplier_type: value })
                }
              >
                <SelectTrigger id="supplier-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="job_work">Job Work Party</SelectItem>
                  <SelectItem value="cash_purchase">Cash Purchase</SelectItem>
                  <SelectItem value="customer_provided">Customer Provided</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-name">Name *</Label>
            <Input
              id="supplier-name"
              placeholder="e.g. Reliance Industries Ltd"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier-contact">Contact Person</Label>
              <Input
                id="supplier-contact"
                placeholder="Contact name"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-phone">Phone</Label>
              <Input
                id="supplier-phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-gst">GST Number</Label>
            <Input
              id="supplier-gst"
              placeholder="e.g. 27AABCU9603R1ZM"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSupplier.isPending || !formData.code.trim() || !formData.name.trim()}
            >
              {createSupplier.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Supplier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
