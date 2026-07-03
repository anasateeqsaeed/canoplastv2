import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, RotateCcw, ShieldCheck, Info, Copy, ChevronsUpDown, Check, Clock, Eraser } from 'lucide-react';
import { AppRole } from '@/hooks/useAuth';
import { MODULES } from '@/hooks/useRolePermissions';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import {
  useUpsertUserPermissionOverride,
  useResetUserPermissionOverride,
  useResetAllUserPermissionOverrides,
  useSetOverrideExpiry,
  useSetAllOverridesExpiry,
  useBulkModuleOverride,
  useBulkColumnOverride,
  useCopyPermissionsFromUser,
} from '@/hooks/useUserPermissionOverrides';
import { useProfiles } from '@/hooks/useUserRoles';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface UserPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  super_user: 'Super User',
  production_manager: 'Production Manager',
  quality_manager: 'Quality Manager',
  operator: 'Operator',
  assistant: 'Assistant',
  data_entry: 'Data Entry',
  store_incharge: 'Store Incharge',
  mixer_operator: 'Mixer Operator',
  tooling_maintenance: 'Tooling & Maintenance',
  maintenance_operator: 'Maintenance Operator',
  hr_manager: 'HR Manager',
  sales_manager: 'Sales Manager',
  accountant: 'Accountant',
  finance_manager: 'Finance Manager',
};

type PermCol = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

export function UserPermissionDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userRole,
}: UserPermissionDialogProps) {
  const { data: permissions = [], isLoading } = useEffectivePermissions(userId, userRole);
  const upsertOverride = useUpsertUserPermissionOverride();
  const resetOverride = useResetUserPermissionOverride();
  const resetAll = useResetAllUserPermissionOverrides();
  const setExpiry = useSetOverrideExpiry();
  const setAllExpiry = useSetAllOverridesExpiry();
  const bulkModule = useBulkModuleOverride();
  const bulkColumn = useBulkColumnOverride();
  const copyFrom = useCopyPermissionsFromUser();

  const { data: profiles = [] } = useProfiles();
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySource, setCopySource] = useState<string>('');
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [bulkExpiryInput, setBulkExpiryInput] = useState('');

  const sourceCandidates = useMemo(
    () => profiles.filter((p) => p.user_id !== userId && p.is_active !== false),
    [profiles, userId],
  );

  const handlePermissionToggle = async (
    module: string,
    permission: PermCol,
    currentEffective: boolean,
    currentOverride: boolean | null,
    roleDefault: boolean,
  ) => {
    let newValue: boolean | null;
    if (currentOverride !== null) {
      const toggled = !currentEffective;
      newValue = toggled === roleDefault ? null : toggled;
    } else {
      newValue = !roleDefault;
    }
    await upsertOverride.mutateAsync({ userId, module, permission, value: newValue });
  };

  const handleResetModule = async (module: string) => {
    await resetOverride.mutateAsync({ userId, module });
  };

  const handleRowAll = async (module: string, value: boolean | null) => {
    await bulkModule.mutateAsync({ userId, module, value });
  };

  const handleColumnAll = async (column: PermCol, value: boolean | null) => {
    await bulkColumn.mutateAsync({ userId, column, value });
  };

  const handleSetRowExpiry = async (module: string, val: string) => {
    const iso = val ? new Date(val).toISOString() : null;
    await setExpiry.mutateAsync({ userId, module, expiresAt: iso });
  };

  const handleSetAllExpiry = async () => {
    const iso = bulkExpiryInput ? new Date(bulkExpiryInput).toISOString() : null;
    await setAllExpiry.mutateAsync({ userId, expiresAt: iso });
  };

  const handleConfirmCopy = async () => {
    if (!copySource) return;
    await copyFrom.mutateAsync({ sourceUserId: copySource, targetUserId: userId, targetRole: userRole });
    setConfirmCopy(false);
    setCopySource('');
  };

  const handleConfirmResetAll = async () => {
    await resetAll.mutateAsync({ userId });
    setConfirmReset(false);
  };

  const hasAnyOverride = (perm: typeof permissions[0]) =>
    perm.overrides.can_view !== null ||
    perm.overrides.can_create !== null ||
    perm.overrides.can_edit !== null ||
    perm.overrides.can_delete !== null;

  const sourceLabel = copySource
    ? sourceCandidates.find((p) => p.user_id === copySource)?.full_name ||
      sourceCandidates.find((p) => p.user_id === copySource)?.email ||
      'Selected user'
    : 'Pick a user…';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} />
              Edit Permissions: {userName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Role + bulk actions */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <Badge variant="outline" className="text-sm">
                {roleLabels[userRole]}
              </Badge>
              <span className="text-xs text-muted-foreground flex-1 min-w-[200px]">
                Base permissions from role. Override below for this user only.
              </span>

              {/* Copy from another user */}
              <Popover open={copyOpen} onOpenChange={setCopyOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Copy size={14} /> Copy from user
                    <ChevronsUpDown size={12} className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[320px]" align="end">
                  <Command>
                    <CommandInput placeholder="Search user…" />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        {sourceCandidates.map((p) => (
                          <CommandItem
                            key={p.user_id}
                            value={`${p.full_name ?? ''} ${p.email ?? ''}`}
                            onSelect={() => {
                              setCopySource(p.user_id);
                              setCopyOpen(false);
                              setConfirmCopy(true);
                            }}
                          >
                            <Check
                              size={14}
                              className={cn('mr-2', copySource === p.user_id ? 'opacity-100' : 'opacity-0')}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">{p.full_name || '—'}</span>
                              <span className="text-xs text-muted-foreground">{p.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setConfirmReset(true)}
              >
                <Eraser size={14} /> Reset all
              </Button>
            </div>

            {/* Bulk expiry */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <Clock size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">Auto-expire all overrides:</span>
              <Input
                type="datetime-local"
                value={bulkExpiryInput}
                onChange={(e) => setBulkExpiryInput(e.target.value)}
                className="w-[220px] h-8"
              />
              <Button size="sm" onClick={handleSetAllExpiry} disabled={setAllExpiry.isPending}>
                Apply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBulkExpiryInput('');
                  setAllExpiry.mutate({ userId, expiresAt: null });
                }}
                disabled={setAllExpiry.isPending}
              >
                Clear expiry
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                After this date, overrides stop and the user falls back to role defaults.
              </span>
            </div>

            {/* Permissions Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Module</th>
                      {(['can_view', 'can_create', 'can_edit', 'can_delete'] as PermCol[]).map((c) => {
                        const label = c === 'can_view' ? 'V' : c === 'can_create' ? 'C' : c === 'can_edit' ? 'E' : 'D';
                        const full = c.replace('can_', '');
                        return (
                          <th key={c} className="text-center p-2 font-medium w-20">
                            <div className="flex flex-col items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>{label}</TooltipTrigger>
                                  <TooltipContent className="capitalize">{full}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <div className="flex gap-0.5">
                                <button
                                  type="button"
                                  className="text-[10px] px-1 rounded border hover:bg-accent"
                                  title={`Grant ${full} on all modules`}
                                  onClick={() => handleColumnAll(c, true)}
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  className="text-[10px] px-1 rounded border hover:bg-accent"
                                  title={`Revoke ${full} on all modules`}
                                  onClick={() => handleColumnAll(c, false)}
                                >
                                  ✗
                                </button>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                      <th className="text-center p-3 font-medium w-[170px]">Expires</th>
                      <th className="text-center p-3 font-medium w-[140px]">Bulk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((perm) => {
                      const hasOverride = hasAnyOverride(perm);
                      const expVal = perm.expiresAt ? perm.expiresAt.slice(0, 16) : '';
                      return (
                        <tr
                          key={perm.module}
                          className={cn('border-t', hasOverride && 'bg-primary/5')}
                        >
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-2">
                              {perm.moduleLabel}
                              {hasOverride && (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                  Custom
                                </Badge>
                              )}
                              {perm.isExpired && (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                  Expired
                                </Badge>
                              )}
                            </div>
                          </td>
                          {(['can_view', 'can_create', 'can_edit', 'can_delete'] as PermCol[]).map((c) => (
                            <td key={c} className="text-center p-3">
                              <PermissionCheckbox
                                checked={perm[c]}
                                hasOverride={perm.overrides[c] !== null}
                                onChange={() =>
                                  handlePermissionToggle(
                                    perm.module,
                                    c,
                                    perm[c],
                                    perm.overrides[c],
                                    perm.roleDefaults[c],
                                  )
                                }
                                disabled={upsertOverride.isPending}
                              />
                            </td>
                          ))}
                          <td className="text-center p-2">
                            <Input
                              type="datetime-local"
                              value={expVal}
                              onChange={(e) => handleSetRowExpiry(perm.module, e.target.value)}
                              disabled={!hasOverride || setExpiry.isPending}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRowAll(perm.module, true)}
                                disabled={bulkModule.isPending}
                                className="h-7 px-2 text-xs"
                                title="Grant all"
                              >
                                All
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRowAll(perm.module, false)}
                                disabled={bulkModule.isPending}
                                className="h-7 px-2 text-xs"
                                title="Revoke all"
                              >
                                None
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetModule(perm.module)}
                                disabled={!hasOverride || resetOverride.isPending}
                                className="h-7 w-7 p-0"
                                title="Reset to role defaults"
                              >
                                <RotateCcw size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              <Info size={16} className="mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Tips</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-blue-600 dark:text-blue-400">
                  <li>Use column ✓/✗ to grant or revoke an action across every module at once.</li>
                  <li>Use row "All / None" for a single module, "Reset" to clear overrides.</li>
                  <li>Set an expiry to make the override temporary — perfect for stand-in cover.</li>
                  <li>"Copy from user" duplicates another user's effective permissions as a starting point.</li>
                </ul>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCopy} onOpenChange={setConfirmCopy}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy permissions from {sourceLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite existing overrides for <b>{userName}</b> so their effective permissions match
              the source user. Their base role ({roleLabels[userRole]}) is unchanged. You can still tweak
              individual checkboxes afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCopySource('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCopy} disabled={copyFrom.isPending}>
              {copyFrom.isPending ? 'Copying…' : 'Copy permissions'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all overrides for {userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              All custom permissions will be removed. The user will go back to the defaults of their role
              ({roleLabels[userRole]}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmResetAll} disabled={resetAll.isPending}>
              {resetAll.isPending ? 'Clearing…' : 'Clear all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PermissionCheckbox({
  checked,
  hasOverride,
  onChange,
  disabled,
}: {
  checked: boolean;
  hasOverride: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-center">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={cn(
          'h-5 w-5',
          hasOverride && 'border-2 border-primary ring-2 ring-primary/20',
        )}
      />
    </div>
  );
}

// Helper component for date display (not currently used externally but kept for tooltip formatting)
export function formatExpiry(iso: string | null) {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'PPp');
  } catch {
    return iso;
  }
}
