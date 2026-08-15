import { useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialReturns, MaterialReturnInput, RETURN_TYPES } from '@/hooks/useMaterialReturns';
import { useStorageLocations } from '@/hooks/useStorageLocations';
// useMachines reconnects in Phase 5
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CheckCircle, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { PermGate } from '@/components/auth/PermGate';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
  received: { label: 'Received', color: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
};

const SHIFTS = [
  { value: 'A', label: 'Shift A (6AM-2PM)' },
  { value: 'B', label: 'Shift B (2PM-10PM)' },
  { value: 'C', label: 'Shift C (10PM-6AM)' },
];

export default function MaterialReturn() {
  const ALL_STATUS = '__all__';
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = usePersistedState('material-return.search', '');
  const [statusFilter, setStatusFilter] = usePersistedState<string>('material-return.status', '');
  const { returns, isLoading, createReturn, updateReturnStatus } = useMaterialReturns(statusFilter || undefined);
  const { locations } = useStorageLocations();
  // Machine selection reconnects in Phase 5 (machines table)

  const [formData, setFormData] = useState<Partial<MaterialReturnInput>>({
    from_department: '',
    quantity_kg: 0,
    return_type: 'unused_material',
  });

  const handleCreate = () => {
    if (!formData.from_department || !formData.quantity_kg || !formData.return_type) {
      return;
    }
    createReturn.mutate(formData as MaterialReturnInput, {
      onSuccess: () => {
        setShowNewDialog(false);
        setFormData({ from_department: '', quantity_kg: 0, return_type: 'unused_material' });
      },
    });
  };

  const handleReceive = (id: string) => {
    // received_by is recorded as the logged-in user inside the hook
    updateReturnStatus.mutate({ id, status: 'received' });
  };

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = !searchTerm || 
      ret.return_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.from_department?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Get regrind locations for returns
  const regrindLocations = locations.filter(l => l.zone === 'regrind' && l.is_active);
  const compoundLocations = locations.filter(l => l.zone === 'compound' && l.is_active);
  const rawMaterialLocations = locations.filter(l => l.zone === 'raw_material' && l.is_active);

  const getLocationOptions = (returnType: string) => {
    switch (returnType) {
      case 'regrind':
      case 'floor_sweep':
        return regrindLocations;
      case 'leftover_compound':
        return compoundLocations;
      default:
        return rawMaterialLocations;
    }
  };

  return (
    <MainLayout 
      title="Material Return" 
      subtitle="Receive returned materials from production"
      actions={
        <PermGate module="inventory" action="create">
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Return
          </Button>
        </PermGate>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by return number or department..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter === '' ? ALL_STATUS : statusFilter}
              onValueChange={(v) => setStatusFilter(v === ALL_STATUS ? '' : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS}>All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Material Returns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No return records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty (kg)</TableHead>
                    <TableHead>To Location</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((ret) => {
                    const status = STATUS_CONFIG[ret.status] || STATUS_CONFIG.pending;
                    const typeLabel = RETURN_TYPES.find(t => t.value === ret.return_type)?.label || ret.return_type;
                    return (
                      <TableRow key={ret.id}>
                        <TableCell className="font-mono text-sm">{ret.return_number}</TableCell>
                        <TableCell>{format(new Date(ret.return_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{ret.from_department}</TableCell>
                        <TableCell>{ret.from_machine?.machine_id || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{typeLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{ret.quantity_kg}</TableCell>
                        <TableCell>{ret.to_location?.location_code || '-'}</TableCell>
                        <TableCell>{ret.shift || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-white`}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ret.status === 'pending' && (
                            <Button size="sm" variant="default" onClick={() => handleReceive(ret.id)}>
                              Receive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Return Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Material Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Department</Label>
                <Input
                  placeholder="e.g., Injection"
                  value={formData.from_department || ''}
                  onChange={(e) => setFormData({ ...formData, from_department: e.target.value })}
                />
              </div>
              {/* "From Machine" selector reconnects in Phase 5 (machines table) */}
            </div>

            <div className="space-y-2">
              <Label>Return Type</Label>
              <RadioGroup 
                value={formData.return_type || 'unused_material'} 
                onValueChange={(v) => setFormData({ ...formData, return_type: v, to_location_id: undefined })}
                className="grid grid-cols-2 gap-2"
              >
                {RETURN_TYPES.map(type => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <Label htmlFor={type.value} className="font-normal">{type.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>To Storage Location</Label>
              <Select value={formData.to_location_id || ''} onValueChange={(v) => setFormData({ ...formData, to_location_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {getLocationOptions(formData.return_type || 'unused_material').map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.location_code} - {loc.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity (kg)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.quantity_kg || ''}
                  onChange={(e) => setFormData({ ...formData, quantity_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={formData.shift || ''} onValueChange={(v) => setFormData({ ...formData, shift: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* "Returned By" is recorded automatically as the logged-in user */}
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea 
                placeholder="Any additional notes..."
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createReturn.isPending}>
              {createReturn.isPending ? 'Creating...' : 'Create Return Slip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
