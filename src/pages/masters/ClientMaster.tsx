import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataTable, Column } from '@/components/masters/DataTable';
import { StatusBadge } from '@/components/masters/StatusBadge';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, Client } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { Building, CreditCard, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshButton } from '@/components/layout/RefreshButton';

export default function ClientMaster() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const columns: Column<Client>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (item) => <span className="font-medium text-primary">{item.code}</span>,
    },
    {
      key: 'name',
      label: 'Client Name',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.contact_person}</p>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      render: (item) => (
        <span className="text-muted-foreground text-sm">
          {item.address || '-'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Contact',
      render: (item) => (
        <div className="text-sm">
          <p>{item.phone || '-'}</p>
          <p className="text-xs text-muted-foreground">{item.email || '-'}</p>
        </div>
      ),
    },
    {
      key: 'gst_number',
      label: 'GST Number',
      render: (item) => <span className="font-mono text-sm">{item.gst_number || '-'}</span>,
    },
    {
      key: 'credit_limit',
      label: 'Credit',
      render: (item) => (
        <div className="text-sm">
          <p className="font-medium">Rs {Number(item.credit_limit || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{item.payment_terms || 30} days</p>
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} />,
    },
  ];

  const handleAdd = () => {
    setSelectedClient(null);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (client: Client) => {
    if (confirm(`Are you sure you want to delete ${client.name}?`)) {
      deleteClient.mutate(client.id);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      contact_person: formData.get('contact_person') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      gst_number: formData.get('gst_number') as string,
      credit_limit: Number(formData.get('credit_limit')) || 0,
      payment_terms: Number(formData.get('payment_terms')) || 30,
      is_active: true,
    };

    if (selectedClient) {
      updateClient.mutate({ id: selectedClient.id, ...data });
    } else {
      createClient.mutate(data);
    }
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <MainLayout title="Client Master" subtitle="Manage customer database">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  const activeClients = clients.filter((c) => c.is_active);
  const totalCredit = clients.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);

  return (
    <MainLayout title="Client Master" subtitle="Manage customer database">
      <div className="animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{clients.length}</p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-success/30 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Building size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{activeClients.length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <CreditCard size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  Rs {(totalCredit / 100000).toFixed(1)}L
                </p>
                <p className="text-sm text-muted-foreground">Total Credit</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <MapPin size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {clients.length - activeClients.length}
                </p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </div>
        </div>

        <DataTable
          data={clients}
          columns={columns}
          searchPlaceholder="Search clients..."
          onAdd={handleAdd}
          addLabel="Add Client"
          onEdit={handleEdit}
          onView={handleView}
          onDelete={isAdmin ? handleDelete : undefined}
        />
      </div>

      {/* Client Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode ? 'View Client' : selectedClient ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Client Code *</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={selectedClient?.code}
                  required
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedClient?.name}
                  required
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  defaultValue={selectedClient?.contact_person || ''}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={selectedClient?.phone || ''}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={selectedClient?.email || ''}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={selectedClient?.address || ''}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  name="gst_number"
                  defaultValue={selectedClient?.gst_number || ''}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Credit Limit (Rs)</Label>
                <Input
                  id="credit_limit"
                  name="credit_limit"
                  type="number"
                  defaultValue={selectedClient?.credit_limit || 0}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
                <Input
                  id="payment_terms"
                  name="payment_terms"
                  type="number"
                  defaultValue={selectedClient?.payment_terms || 30}
                  disabled={isViewMode}
                />
              </div>
            </div>
            {!isViewMode && (
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>
                  {selectedClient ? 'Update' : 'Save'}
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
