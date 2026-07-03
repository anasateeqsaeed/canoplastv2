import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataTable, Column } from '@/components/masters/DataTable';
import { StatusBadge } from '@/components/masters/StatusBadge';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, Department } from '@/hooks/useDepartments';
import { GitBranch, Factory, ClipboardCheck, Wrench, Package, Calculator, Users } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { RefreshButton } from '@/components/layout/RefreshButton';

export default function DepartmentMaster() {
  const { data: departments = [], isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const getTypeIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('production') || n.includes('molding')) return <Factory size={14} />;
    if (n.includes('quality')) return <ClipboardCheck size={14} />;
    if (n.includes('maintenance')) return <Wrench size={14} />;
    if (n.includes('store') || n.includes('warehouse')) return <Package size={14} />;
    if (n.includes('account') || n.includes('finance')) return <Calculator size={14} />;
    if (n.includes('hr') || n.includes('human')) return <Users size={14} />;
    return <GitBranch size={14} />;
  };

  const getTypeStyle = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('production') || n.includes('molding')) return 'bg-primary/10 text-primary';
    if (n.includes('quality')) return 'bg-success/10 text-success';
    if (n.includes('maintenance')) return 'bg-warning/10 text-warning';
    if (n.includes('store') || n.includes('warehouse')) return 'bg-accent/10 text-accent';
    return 'bg-muted text-muted-foreground';
  };

  const columns: Column<Department>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (item) => <span className="font-medium text-primary font-mono">{item.code}</span>,
    },
    {
      key: 'name',
      label: 'Department Name',
      sortable: true,
      render: (item) => <span className="font-medium text-foreground">{item.name}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      render: (item) => (
        <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize', getTypeStyle(item.name))}>
          {getTypeIcon(item.name)}
          {item.description || item.name}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} />,
    },
  ];

  const handleAdd = () => {
    setSelectedDepartment(null);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleView = (department: Department) => {
    setSelectedDepartment(department);
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (department: Department) => {
    // v1 checked the `machines` and `operators` tables for dependencies before
    // deleting, but neither exists yet in v2 (they land in the Production-module
    // phase), so that check is omitted for now.
    if (confirm(`Are you sure you want to delete ${department.name}?`)) {
      deleteDepartment.mutate(department.id);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      is_active: true,
    };

    if (selectedDepartment) {
      updateDepartment.mutate({ id: selectedDepartment.id, ...data });
    } else {
      createDepartment.mutate(data);
    }
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <MainLayout title="Department Master" subtitle="Manage organizational structure">
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

  const production = departments.filter((d) => d.name.toLowerCase().includes('production') || d.name.toLowerCase().includes('molding'));
  const quality = departments.filter((d) => d.name.toLowerCase().includes('quality'));
  const maintenance = departments.filter((d) => d.name.toLowerCase().includes('maintenance'));

  return (
    <MainLayout title="Department Master" subtitle="Manage organizational structure">
      <div className="animate-fade-in">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GitBranch size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{departments.length}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Factory size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{production.length}</p>
                <p className="text-sm text-muted-foreground">Production</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <ClipboardCheck size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{quality.length}</p>
                <p className="text-sm text-muted-foreground">Quality</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Wrench size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{maintenance.length}</p>
                <p className="text-sm text-muted-foreground">Maintenance</p>
              </div>
            </div>
          </div>
        </div>

        <DataTable
          data={departments}
          columns={columns}
          searchPlaceholder="Search departments..."
          onAdd={handleAdd}
          addLabel="Add Department"
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
        />
      </div>

      {/* Department Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isViewMode ? 'View Department' : selectedDepartment ? 'Edit Department' : 'Add New Department'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Department Code *</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={selectedDepartment?.code}
                  required
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedDepartment?.name}
                  required
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={selectedDepartment?.description || ''}
                  disabled={isViewMode}
                />
              </div>
            </div>
            {!isViewMode && (
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDepartment.isPending || updateDepartment.isPending}>
                  {selectedDepartment ? 'Update' : 'Save'}
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
