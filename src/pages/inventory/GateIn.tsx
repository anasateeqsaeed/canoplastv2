import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableComboBox, ComboBoxOption } from '@/components/ui/searchable-combobox';
import { SupplierSelector } from '@/components/selectors/SupplierSelector';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { Skeleton } from '@/components/ui/skeleton';
import { useGateMovements, useCreateGateMovement, useUpdateGateMovementStatus, GateMovementInsert } from '@/hooks/useGateMovements';
import { useMaterials } from '@/hooks/useMaterials';
import { Plus, DoorOpen, Search, Factory, Building2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PermGate } from '@/components/auth/PermGate';

// The party a gate-in entry is tied to is optional — a movement may be
// against a vendor (supplier), a customer (client), or neither.
type PartyKind = 'none' | 'vendor' | 'customer';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-yellow-500' },
  closed: { label: 'Closed', color: 'bg-green-500' },
  returned: { label: 'Returned', color: 'bg-blue-500' },
};

interface FormData {
  movement_date: string;
  gate_pass_no: string;
  party_kind: PartyKind;
  vendor_id: string;
  customer_id: string;
  party_name: string;
  material_id: string;
  item_description: string;
  quantity: string;
  unit: string;
  vehicle_no: string;
  driver_name: string;
  returnable: boolean;
  remarks: string;
}

const INITIAL_FORM_DATA: FormData = {
  movement_date: new Date().toISOString().slice(0, 10),
  gate_pass_no: '',
  party_kind: 'none',
  vendor_id: '',
  customer_id: '',
  party_name: '',
  material_id: '',
  item_description: '',
  quantity: '',
  unit: '',
  vehicle_no: '',
  driver_name: '',
  returnable: false,
  remarks: '',
};

export default function GateIn() {
  const ALL_STATUS = '__all__';
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  const { data: movements = [], isLoading } = useGateMovements('in');
  const { data: materials = [] } = useMaterials();
  const createMovement = useCreateGateMovement();
  const updateStatus = useUpdateGateMovementStatus();

  // Dropdown item list of materials (active materials only, searchable).
  const materialOptions = useMemo((): ComboBoxOption[] => {
    return materials
      .filter((m) => m.is_active !== false)
      .map((m) => ({
        value: m.id,
        label: `${m.code} - ${m.name}`,
        description: m.material_type || undefined,
      }));
  }, [materials]);

  const handleMaterialChange = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    setFormData((prev) => ({
      ...prev,
      material_id: materialId,
      item_description: material?.name || '',
      unit: material?.unit || prev.unit,
    }));
  };

  const handlePartyKindChange = (kind: PartyKind) => {
    // Reset the other party's selection when the kind changes.
    setFormData((prev) => ({
      ...prev,
      party_kind: kind,
      vendor_id: '',
      customer_id: '',
      party_name: '',
    }));
  };

  const resetForm = () => setFormData(INITIAL_FORM_DATA);

  const handleDialogClose = () => {
    setShowNewDialog(false);
    resetForm();
  };

  const handleCreate = () => {
    if (!formData.material_id) {
      toast.error('Please select a material');
      return;
    }
    if (formData.party_kind === 'vendor' && !formData.vendor_id) {
      toast.error('Please select a vendor');
      return;
    }
    if (formData.party_kind === 'customer' && !formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    const payload: GateMovementInsert = {
      type: 'material_inward',
      direction: 'in',
      movement_date: formData.movement_date,
      gate_pass_no: formData.gate_pass_no || null,
      party_kind: formData.party_kind === 'none' ? null : formData.party_kind,
      party_name: formData.party_name || null,
      vendor_id: formData.party_kind === 'vendor' ? formData.vendor_id : null,
      customer_id: formData.party_kind === 'customer' ? formData.customer_id : null,
      item_description: formData.item_description || null,
      quantity: formData.quantity ? Number(formData.quantity) : null,
      unit: formData.unit || null,
      vehicle_no: formData.vehicle_no || null,
      driver_name: formData.driver_name || null,
      returnable: formData.returnable,
      remarks: formData.remarks || null,
      status: 'open',
    };

    createMovement.mutate(payload, {
      onSuccess: () => handleDialogClose(),
    });
  };

  const filteredMovements = movements.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const partyName = m.vendor?.name || m.customer?.name || m.party_name || '';
    return (
      m.gate_pass_no?.toLowerCase().includes(term) ||
      m.item_description?.toLowerCase().includes(term) ||
      m.vehicle_no?.toLowerCase().includes(term) ||
      partyName.toLowerCase().includes(term)
    );
  });

  const renderParty = (m: (typeof movements)[number]) => {
    if (m.vendor) {
      return (
        <div className="flex items-center gap-1.5">
          <Factory className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{m.vendor.name}</span>
          <Badge variant="outline" className="text-[10px]">Vendor</Badge>
        </div>
      );
    }
    if (m.customer) {
      return (
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{m.customer.name}</span>
          <Badge variant="outline" className="text-[10px]">Customer</Badge>
        </div>
      );
    }
    return <span className="text-muted-foreground">{m.party_name || '—'}</span>;
  };

  return (
    <MainLayout
      title="Material Gate In"
      subtitle="Record materials entering the gate (vendor or customer)"
      actions={
        <PermGate module="inventory" action="create">
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Gate In
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
                placeholder="Search by gate pass, material, party or vehicle..."
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

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Gate In Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No gate in entries found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gate Pass #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Returnable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((m) => {
                    const status = STATUS_CONFIG[m.status] || STATUS_CONFIG.open;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-sm">{m.gate_pass_no || '—'}</TableCell>
                        <TableCell>{format(new Date(m.movement_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{renderParty(m)}</TableCell>
                        <TableCell>{m.item_description || '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {m.quantity != null ? `${m.quantity}${m.unit ? ` ${m.unit}` : ''}` : '—'}
                        </TableCell>
                        <TableCell>{m.vehicle_no || '—'}</TableCell>
                        <TableCell>
                          {m.returnable ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">Returnable</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {m.returnable && m.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus.mutate({ id: m.id, status: 'returned' })}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Mark Returned
                              </Button>
                            )}
                            {!m.returnable && m.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus.mutate({ id: m.id, status: 'closed' })}
                              >
                                Close
                              </Button>
                            )}
                          </div>
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

      {/* New Gate In Dialog */}
      <Dialog open={showNewDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Material Gate In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Row 1: Date & Gate Pass */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.movement_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, movement_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Gate Pass #</Label>
                <Input
                  placeholder="Optional"
                  value={formData.gate_pass_no}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gate_pass_no: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 2: Party type (optional) + party selector */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Party Type (optional)</Label>
                <Select value={formData.party_kind} onValueChange={(v) => handlePartyKindChange(v as PartyKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {formData.party_kind === 'vendor'
                    ? 'Vendor'
                    : formData.party_kind === 'customer'
                    ? 'Customer'
                    : 'Party'}
                </Label>
                {formData.party_kind === 'vendor' ? (
                  <SupplierSelector
                    value={formData.vendor_id}
                    onChange={(value, supplier) =>
                      setFormData((prev) => ({ ...prev, vendor_id: value, party_name: supplier?.name || '' }))
                    }
                    placeholder="Select vendor..."
                  />
                ) : formData.party_kind === 'customer' ? (
                  <ClientSelector
                    value={formData.customer_id}
                    onChange={(value, client) =>
                      setFormData((prev) => ({ ...prev, customer_id: value, party_name: client?.name || '' }))
                    }
                    placeholder="Select customer..."
                  />
                ) : (
                  <Input disabled placeholder="Select a party type first" />
                )}
              </div>
            </div>

            {/* Row 3: Material dropdown */}
            <div className="space-y-2">
              <Label>Material</Label>
              <SearchableComboBox
                value={formData.material_id}
                onChange={handleMaterialChange}
                options={materialOptions}
                placeholder="Select material..."
                searchPlaceholder="Search by code or name..."
                emptyMessage="No materials found"
              />
            </div>

            {/* Row 4: Quantity & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  placeholder="e.g. kg, pcs"
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 5: Vehicle & Driver */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle #</Label>
                <Input
                  placeholder="Optional"
                  value={formData.vehicle_no}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vehicle_no: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input
                  placeholder="Optional"
                  value={formData.driver_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, driver_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Returnable */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="returnable"
                checked={formData.returnable}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, returnable: checked === true }))
                }
              />
              <Label htmlFor="returnable" className="cursor-pointer">
                Returnable (item expected to go back out through the gate)
              </Label>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={formData.remarks}
                onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMovement.isPending || !formData.material_id}>
              {createMovement.isPending ? 'Saving...' : 'Record Gate In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
