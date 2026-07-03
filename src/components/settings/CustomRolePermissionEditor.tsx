import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomRolePermissions, useUpdateCustomRolePermission, CustomRole } from '@/hooks/useCustomRoles';
import { MODULES } from '@/hooks/useRolePermissions';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  role: CustomRole | null;
}

type Action = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
const actions: Action[] = ['can_view', 'can_create', 'can_edit', 'can_delete'];
const actionLabels: Record<Action, string> = {
  can_view: 'View',
  can_create: 'Create',
  can_edit: 'Edit',
  can_delete: 'Delete',
};

export function CustomRolePermissionEditor({ open, onOpenChange, role }: Props) {
  const { data: perms, isLoading } = useCustomRolePermissions(role?.id ?? null);
  const update = useUpdateCustomRolePermission();

  const handleToggle = (id: string, action: Action, current: boolean) => {
    update.mutate({ id, updates: { [action]: !current } as any });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Permissions for
            {role && <Badge variant="outline" className={role.color ?? ''}>{role.name}</Badge>}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  {actions.map((a) => (
                    <TableHead key={a} className="text-center">{actionLabels[a]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map((mod) => {
                  const row = perms?.find((p) => p.module === mod.id);
                  return (
                    <TableRow key={mod.id}>
                      <TableCell className="font-medium">{mod.label}</TableCell>
                      {actions.map((a) => (
                        <TableCell key={a} className="text-center">
                          <Checkbox
                            checked={!!row?.[a]}
                            disabled={!row || update.isPending}
                            onCheckedChange={() => row && handleToggle(row.id, a, !!row[a])}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Changes save automatically. Users with this role will pick up the new permissions on their next page load.
        </p>
      </DialogContent>
    </Dialog>
  );
}
