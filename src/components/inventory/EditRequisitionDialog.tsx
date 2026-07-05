import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { RequisitionItem } from '@/hooks/useStoreRequisitions';

interface EditRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisitionId: string;
  requisitionNumber: string;
  items: RequisitionItem[];
  onSuccess: () => void;
}

interface EditableItem extends RequisitionItem {
  adjusted_qty_kg: number;
  source_type_edit: string;
  isModified: boolean;
}

const SOURCE_TYPES = [
  { value: 'fresh', label: 'Fresh Stock' },
  { value: 'regrind', label: 'Regrind' },
  { value: 'leftover', label: 'Leftover Compound' },
];

export function EditRequisitionDialog({
  open,
  onOpenChange,
  requisitionId,
  requisitionNumber,
  items,
  onSuccess,
}: EditRequisitionDialogProps) {
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editable items when dialog opens
  useEffect(() => {
    if (open && items.length > 0) {
      setEditableItems(
        items.map((item) => ({
          ...item,
          adjusted_qty_kg: item.required_qty_kg,
          source_type_edit: item.source_type || 'fresh',
          isModified: false,
        }))
      );
      setAdjustmentReason('');
    }
  }, [open, items]);

  const handleQtyChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditableItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              adjusted_qty_kg: numValue,
              isModified: numValue !== item.required_qty_kg || item.source_type_edit !== (item.source_type || 'fresh'),
            }
          : item
      )
    );
  };

  const handleSourceChange = (index: number, value: string) => {
    setEditableItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              source_type_edit: value,
              isModified: item.adjusted_qty_kg !== item.required_qty_kg || value !== (item.source_type || 'fresh'),
            }
          : item
      )
    );
  };

  const calculateTotals = () => {
    const originalTotal = items.reduce((sum, item) => sum + item.required_qty_kg, 0);
    const adjustedTotal = editableItems.reduce((sum, item) => sum + item.adjusted_qty_kg, 0);
    return { originalTotal, adjustedTotal };
  };

  const hasModifications = editableItems.some((item) => item.isModified);

  const handleSave = async () => {
    if (!adjustmentReason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    const modifiedItems = editableItems.filter((item) => item.isModified);
    if (modifiedItems.length === 0) {
      toast.info('No changes to save');
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      // Update each modified item
      for (const item of modifiedItems) {
        const { error } = await supabase
          .from('requisition_items')
          .update({
            original_qty_kg: item.required_qty_kg,
            adjusted_qty_kg: item.adjusted_qty_kg,
            source_type: item.source_type_edit,
            adjustment_reason: adjustmentReason,
            adjusted_by: 'Store Manager', // TODO: Use actual logged in user
            adjusted_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (error) throw error;
      }

      toast.success(`Updated ${modifiedItems.length} material(s) successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const { originalTotal, adjustedTotal } = calculateTotals();
  const totalDiff = adjustedTotal - originalTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Requisition - {requisitionNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-muted-foreground">
              Adjust material quantities and sources as needed. You can reduce fresh material and increase regrind/leftover to substitute during shortage.
            </p>
          </div>

          {/* Materials Table */}
          <div>
            <h4 className="font-medium mb-3">Material Adjustments</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Original (kg)</TableHead>
                    <TableHead className="text-right">Adjusted (kg)</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editableItems.map((item, index) => (
                    <TableRow key={item.id} className={item.isModified ? 'bg-yellow-50/50' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.material?.code || '-'}</p>
                          <p className="text-xs text-muted-foreground">{item.material?.name || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{item.material_role || '-'}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.required_qty_kg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.adjusted_qty_kg}
                          onChange={(e) => handleQtyChange(index, e.target.value)}
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.source_type_edit}
                          onValueChange={(value) => handleSourceChange(index, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SOURCE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {item.isModified ? (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Modified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unchanged</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-muted-foreground">Original Total</p>
                <p className="font-medium">{originalTotal.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Adjusted Total</p>
                <p className="font-medium">{adjustedTotal.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Difference</p>
                <p className={`font-medium ${totalDiff !== 0 ? 'text-yellow-600' : ''}`}>
                  {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(2)} kg
                </p>
              </div>
            </div>
            {totalDiff !== 0 && (
              <div className="flex items-center gap-1 text-yellow-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Total quantity changed
              </div>
            )}
          </div>

          {/* Adjustment Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Adjustment Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Using shift regrind instead of fresh - shortage in godown"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasModifications || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
