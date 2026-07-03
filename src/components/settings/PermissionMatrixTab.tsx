import { useState } from 'react';
import { useRolePermissions, MODULES, useUpdateRolePermission } from '@/hooks/useRolePermissions';
import { AppRole } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  super_user: 'Super',
  production_manager: 'Prod Mgr',
  quality_manager: 'QC Mgr',
  store_incharge: 'Store',
  assistant: 'Asst',
  data_entry: 'Data',
  operator: 'Op',
  mixer_operator: 'Mixer',
  tooling_maintenance: 'Tooling',
  maintenance_operator: 'Maint Op',
  hr_manager: 'HR Mgr',
  sales_manager: 'Sales',
  accountant: 'Actg',
  finance_manager: 'Fin Mgr',
};

const allRoles: AppRole[] = ['admin', 'super_user', 'production_manager', 'quality_manager', 'store_incharge', 'assistant', 'data_entry', 'operator', 'mixer_operator', 'tooling_maintenance', 'maintenance_operator', 'hr_manager', 'sales_manager', 'accountant', 'finance_manager'];

type PermissionType = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

const permissionColors: Record<PermissionType, string> = {
  can_view: 'text-blue-600',
  can_create: 'text-green-600',
  can_edit: 'text-amber-600',
  can_delete: 'text-red-600',
};

const permissionLabels: Record<PermissionType, string> = {
  can_view: 'V',
  can_create: 'C',
  can_edit: 'U',
  can_delete: 'D',
};

export function PermissionMatrixTab() {
  const { data: permissions, isLoading } = useRolePermissions();
  const updatePermission = useUpdateRolePermission();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const getPermission = (role: AppRole, module: string) => {
    return permissions?.find(p => p.role === role && p.module === module);
  };

  const handleToggle = async (
    role: AppRole,
    module: string,
    permType: PermissionType,
    currentValue: boolean
  ) => {
    const perm = getPermission(role, module);
    if (!perm) return;

    // Prevent removing admin's settings access
    if (role === 'admin' && module === 'settings' && permType === 'can_view' && currentValue) {
      return;
    }

    setUpdatingId(perm.id);
    await updatePermission.mutateAsync({
      id: perm.id,
      updates: { [permType]: !currentValue },
      role,
      module,
    });
    setUpdatingId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        {MODULES.map((m) => (
          <Skeleton key={m.id} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Click on any permission checkbox to toggle it.
          <span className="font-medium ml-1">V</span>=View,
          <span className="font-medium ml-1">C</span>=Create,
          <span className="font-medium ml-1">U</span>=Update,
          <span className="font-medium ml-1">D</span>=Delete
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10">Module</TableHead>
                {allRoles.map((role) => (
                  <TableHead key={role} className="text-center min-w-[100px]">
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs">
                          {roleLabels[role]}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    {module.label}
                  </TableCell>
                  {allRoles.map((role) => {
                    const perm = getPermission(role, module.id);
                    const isUpdating = updatingId === perm?.id;

                    return (
                      <TableCell key={role} className="text-center">
                        <div className={cn(
                          "flex items-center justify-center gap-1",
                          isUpdating && "opacity-50"
                        )}>
                          {(['can_view', 'can_create', 'can_edit', 'can_delete'] as PermissionType[]).map((permType) => {
                            const hasPermission = perm?.[permType] ?? false;
                            const isDisabled = role === 'admin' && module.id === 'settings' && permType === 'can_view';

                            return (
                              <Tooltip key={permType}>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center">
                                    <span className={cn(
                                      "text-[10px] font-bold",
                                      permissionColors[permType]
                                    )}>
                                      {permissionLabels[permType]}
                                    </span>
                                    <Checkbox
                                      checked={hasPermission}
                                      disabled={isDisabled || isUpdating}
                                      onCheckedChange={() => handleToggle(role, module.id, permType, hasPermission)}
                                      className="h-4 w-4"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {permType.replace('can_', '').replace(/\b\w/g, l => l.toUpperCase())} {module.label}
                                  {isDisabled && ' (Cannot remove)'}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg text-sm">
          <p className="font-medium mb-1">Note:</p>
          <p className="text-muted-foreground">
            Admin's Settings access cannot be removed to prevent lockout.
            Changes are saved automatically when you toggle a checkbox.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
