import { useState } from 'react';
import { useProfiles } from '@/hooks/useUserRoles';
import { useRolePermissions, MODULES } from '@/hooks/useRolePermissions';
import { useCustomRoles, useDeleteCustomRole, useUpdateCustomRole, useAllCustomRolePermissions, CustomRole } from '@/hooks/useCustomRoles';
import { AppRole } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Eye, PenLine, Trash2, Plus, Pencil, Settings2 } from 'lucide-react';
import { CustomRoleDialog } from './CustomRoleDialog';
import { CustomRolePermissionEditor } from './CustomRolePermissionEditor';

const roleConfig: Record<AppRole, { label: string; color: string; description: string }> = {
  admin: {
    label: 'Administrator',
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Full access to all features and settings'
  },
  super_user: {
    label: 'Super User',
    color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
    description: 'Admin-equivalent power. Permissions adjustable by Admin. Cannot manage roles.'
  },
  production_manager: {
    label: 'Production Manager',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Manage production, machines, and jobs'
  },
  quality_manager: {
    label: 'Quality Manager',
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Manage inspections and quality control'
  },
  store_incharge: {
    label: 'Store Incharge',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Manage GRN, stock positions, and material dispatch'
  },
  assistant: {
    label: 'Assistant',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Master data and hourly production entry'
  },
  data_entry: {
    label: 'Data Entry',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    description: 'Hourly production data entry only'
  },
  operator: {
    label: 'Operator',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Mobile production entry for shifts'
  },
  mixer_operator: {
    label: 'Mixer Operator',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    description: 'Mixing department batch processing'
  },
  tooling_maintenance: {
    label: 'Tooling & Maintenance',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Tooling shop jobs and maintenance scheduling'
  },
  maintenance_operator: {
    label: 'Maintenance Operator',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'Daily equipment inspection checklist only'
  },
  hr_manager: {
    label: 'HR Manager',
    color: 'bg-pink-100 text-pink-800 border-pink-300',
    description: 'HR module only: employees, attendance, payroll, advances, departments. No delete; all edits audited.'
  },
  sales_manager: {
    label: 'Sales Manager',
    color: 'bg-violet-100 text-violet-800 border-violet-300',
    description: 'Manage quotations, sales orders, invoices and customer accounts'
  },
  accountant: {
    label: 'Accountant',
    color: 'bg-sky-100 text-sky-800 border-sky-300',
    description: 'Day-to-day bookkeeping: journal entries, AP/AR, bank reconciliation'
  },
  finance_manager: {
    label: 'Finance Manager',
    color: 'bg-lime-100 text-lime-800 border-lime-300',
    description: 'Oversees Accounting and Operational Finance; approves postings and financial reports'
  },
};

const allRoles: AppRole[] = ['admin', 'super_user', 'production_manager', 'quality_manager', 'store_incharge', 'assistant', 'data_entry', 'operator', 'mixer_operator', 'tooling_maintenance', 'maintenance_operator', 'hr_manager', 'sales_manager', 'accountant', 'finance_manager'];

function useCustomRoleAssignmentCounts() {
  return useQuery({
    queryKey: ['user_custom_roles', 'counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_custom_roles' as any)
        .select('custom_role_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        counts[r.custom_role_id] = (counts[r.custom_role_id] ?? 0) + 1;
      });
      return counts;
    },
  });
}

export function RolesTab() {
  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: permissions, isLoading: permissionsLoading } = useRolePermissions();
  const { data: customRoles, isLoading: customRolesLoading } = useCustomRoles();
  const { data: customPerms } = useAllCustomRolePermissions();
  const { data: customCounts } = useCustomRoleAssignmentCounts();
  const updateCustom = useUpdateCustomRole();
  const deleteCustom = useDeleteCustomRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [permEditorOpen, setPermEditorOpen] = useState(false);
  const [permEditorRole, setPermEditorRole] = useState<CustomRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);

  const isLoading = profilesLoading || permissionsLoading || customRolesLoading;

  const roleCounts = allRoles.reduce((acc, role) => {
    acc[role] = profiles?.filter(p => p.roles.includes(role)).length || 0;
    return acc;
  }, {} as Record<AppRole, number>);

  const getPermissionSummary = (role: AppRole) => {
    const rolePerms = permissions?.filter(p => p.role === role) || [];
    return {
      viewCount: rolePerms.filter(p => p.can_view).length,
      createCount: rolePerms.filter(p => p.can_create).length,
      editCount: rolePerms.filter(p => p.can_edit).length,
      deleteCount: rolePerms.filter(p => p.can_delete).length,
    };
  };

  const getCustomSummary = (roleId: string) => {
    const rows = customPerms?.filter(p => p.custom_role_id === roleId) || [];
    return {
      viewCount: rows.filter(p => p.can_view).length,
      createCount: rows.filter(p => p.can_create).length,
      editCount: rows.filter(p => p.can_edit).length,
      deleteCount: rows.filter(p => p.can_delete).length,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const renderPermsCell = (perms: { viewCount: number; createCount: number; editCount: number; deleteCount: number }) => (
    <div className="flex items-center justify-center gap-2">
      <div className="flex items-center gap-1" title="View"><Eye className="h-3.5 w-3.5 text-blue-500" /><span className="text-xs">{perms.viewCount}</span></div>
      <div className="flex items-center gap-1" title="Create"><Plus className="h-3.5 w-3.5 text-green-500" /><span className="text-xs">{perms.createCount}</span></div>
      <div className="flex items-center gap-1" title="Edit"><PenLine className="h-3.5 w-3.5 text-amber-500" /><span className="text-xs">{perms.editCount}</span></div>
      <div className="flex items-center gap-1" title="Delete"><Trash2 className="h-3.5 w-3.5 text-red-500" /><span className="text-xs">{perms.deleteCount}</span></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Built-in roles */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Built-in Roles</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRoles.map((role) => {
                const config = roleConfig[role];
                const perms = getPermissionSummary(role);
                return (
                  <TableRow key={role}>
                    <TableCell>
                      <Badge variant="outline" className={config.color}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{config.description}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{roleCounts[role]}</span>
                      </div>
                    </TableCell>
                    <TableCell>{renderPermsCell(perms)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Custom roles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Custom Roles</h3>
            <p className="text-xs text-muted-foreground">Create named roles with specific permissions for temporary or special-purpose access.</p>
          </div>
          <Button size="sm" onClick={() => { setEditingRole(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Custom Role
          </Button>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customRoles ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    No custom roles yet. Click "New Custom Role" to create one.
                  </TableCell>
                </TableRow>
              )}
              {(customRoles ?? []).map((cr) => {
                const sum = getCustomSummary(cr.id);
                return (
                  <TableRow key={cr.id}>
                    <TableCell>
                      <Badge variant="outline" className={cr.color ?? ''}>{cr.name}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cr.description || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={cr.is_active}
                        onCheckedChange={(v) => updateCustom.mutate({ id: cr.id, updates: { is_active: v } })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{customCounts?.[cr.id] ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>{renderPermsCell(sum)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setPermEditorRole(cr); setPermEditorOpen(true); }} title="Edit permissions">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingRole(cr); setDialogOpen(true); }} title="Rename / change color">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(cr)} title="Delete role">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <span className="font-medium">Legend:</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-blue-500" /> View</span>
          <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5 text-green-500" /> Create</span>
          <span className="flex items-center gap-1"><PenLine className="h-3.5 w-3.5 text-amber-500" /> Edit</span>
          <span className="flex items-center gap-1"><Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete</span>
        </p>
      </div>

      <CustomRoleDialog open={dialogOpen} onOpenChange={setDialogOpen} role={editingRole} />
      <CustomRolePermissionEditor open={permEditorOpen} onOpenChange={setPermEditorOpen} role={permEditorRole} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and remove it from all assigned users.
              They will immediately lose any permissions granted only by this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteCustom.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
