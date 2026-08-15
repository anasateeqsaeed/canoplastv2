import { useState, useMemo, useEffect } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfiles, useAssignRole, useRemoveRole, type ProfileWithRoles } from '@/hooks/useUserRoles';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { AppRole, useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Users, Shield, User, Key, Eye, EyeOff, Plus, Pencil, History, UserCheck, UserX, Check, X, Building2, Trash2, AlertCircle, ShieldCheck, Copy } from 'lucide-react';
import { useUserPermissionOverrides, useUserOverridesSummary } from '@/hooks/useUserPermissionOverrides';
import { MODULES } from '@/hooks/useRolePermissions';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { UserActivityLog } from '@/components/settings/UserActivityLog';
import { UserPermissionDialog } from '@/components/settings/UserPermissionDialog';
import { UserCustomRolesSection } from '@/components/settings/UserCustomRolesSection';
import { RefreshButton } from '@/components/layout/RefreshButton';
import { SearchableComboBox, ComboBoxOption } from '@/components/ui/searchable-combobox';
import { useDepartments } from '@/hooks/useDepartments';
import { useAllUserDepartments, useAssignDepartment, useRemoveDepartment } from '@/hooks/useUserDepartments';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Username validation helper
const validateUsername = (value: string) => {
  const validPattern = /^[a-zA-Z0-9_-]*$/;
  const isValidChars = validPattern.test(value);
  const isValidLength = value.length >= 3;
  return { 
    isValidChars, 
    isValidLength,
    isValid: isValidChars && isValidLength
  };
};

const roleConfig: Record<AppRole, { label: string; color: string; description: string }> = {
  admin: { 
    label: 'Admin', 
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    description: 'Full access to all features and user management'
  },
  super_user: {
    label: 'Super User',
    color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
    description: 'Admin-equivalent power. Permissions adjustable by Admin. Cannot manage roles.'
  },
  production_manager: { 
    label: 'Production Manager', 
    color: 'bg-primary/10 text-primary border-primary/30',
    description: 'Manage jobs, machines, molds, and production reporting'
  },
  quality_manager: { 
    label: 'Quality Manager', 
    color: 'bg-success/10 text-success border-success/30',
    description: 'Manage inspections and quality control'
  },
  operator: { 
    label: 'Operator', 
    color: 'bg-warning/10 text-warning border-warning/30',
    description: 'Record shift production and view assigned jobs'
  },
  assistant: { 
    label: 'Assistant', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Manage master data. Can be restricted to specific departments for hourly entry.'
  },
  data_entry: { 
    label: 'Data Entry', 
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Can ONLY enter and view hourly production. Restricted to assigned departments.'
  },
  store_incharge: { 
    label: 'Store Incharge', 
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Manage GRN, stock positions, and material dispatch/receipt'
  },
  mixer_operator: { 
    label: 'Mixer Operator', 
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    description: 'Mixing department batch processing and work orders'
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

const allRoles: AppRole[] = ['admin', 'super_user', 'production_manager', 'quality_manager', 'operator', 'assistant', 'data_entry', 'store_incharge', 'mixer_operator', 'tooling_maintenance', 'maintenance_operator', 'hr_manager', 'sales_manager', 'accountant', 'finance_manager'];

// Extract username from internal email format
const extractUsername = (email: string | null) => {
  if (!email) return 'Unknown';
  return email.replace('@canoplast.local', '');
};

export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<ProfileWithRoles | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<AppRole[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  
  // Add user form
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRoles, setNewUserRoles] = useState<AppRole[]>([]);
  
  // Edit user form
  const [editFullName, setEditFullName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  
  // Search filter for user table
  const [searchFilter, setSearchFilter] = usePersistedState('user-management.search', '');
  
  // Delete confirmation
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<ProfileWithRoles | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Copy user state
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copySourceUser, setCopySourceUser] = useState<ProfileWithRoles | null>(null);
  const [copyUsername, setCopyUsername] = useState('');
  const [copyPassword, setCopyPassword] = useState('');
  const [copyFullName, setCopyFullName] = useState('');
  const [copyIncludeOverrides, setCopyIncludeOverrides] = useState(true);
  const [showCopyPassword, setShowCopyPassword] = useState(false);
  const [isCopyingUser, setIsCopyingUser] = useState(false);

  const { data: copySourceOverrides = [] } = useUserPermissionOverrides(copySourceUser?.user_id ?? null);
  const copyUsernameValidation = validateUsername(copyUsername);

  const handleOpenCopyDialog = (profile: ProfileWithRoles) => {
    setCopySourceUser(profile);
    setCopyUsername('');
    setCopyPassword('');
    setCopyFullName('');
    setCopyIncludeOverrides(true);
    setShowCopyPassword(false);
    setIsCopyDialogOpen(true);
  };

  const handleCopyUser = async () => {
    if (!copySourceUser) return;
    if (!copyUsernameValidation.isValid) {
      toast.error('Enter a valid username (min 3 chars, letters/numbers/_/-)');
      return;
    }
    if (copyPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsCopyingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'copy',
          sourceUserId: copySourceUser.user_id,
          username: copyUsername,
          password: copyPassword,
          fullName: copyFullName || copyUsername,
          copyOverrides: copyIncludeOverrides,
        },
      });
      if (error) {
        toast.error('Failed to copy user. ' + error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        const roleCount = data?.copiedRoles?.length ?? 0;
        const ovCount = data?.copiedOverrides ?? 0;
        toast.success(`User "${copyUsername}" created`, {
          description: `Copied ${roleCount} role(s) and ${ovCount} permission override(s) from ${extractUsername(copySourceUser.email)}.`,
        });
        setIsCopyDialogOpen(false);
        setCopySourceUser(null);
        refetch();
      }
    } catch (err) {
      console.error('Copy user error:', err);
      toast.error('Failed to copy user');
    } finally {
      setIsCopyingUser(false);
    }
  };

  // Departments data
  const { data: departments = [] } = useDepartments();
  const { data: allUserDepartments = [] } = useAllUserDepartments();
  const assignDepartment = useAssignDepartment();
  const removeDepartment = useRemoveDepartment();

  // Get assigned departments for selected user
  const selectedUserDepartments = useMemo(() => {
    if (!selectedUser) return [];
    return allUserDepartments.filter(ud => ud.user_id === selectedUser.user_id);
  }, [selectedUser, allUserDepartments]);

  // Helper to get departments for any user
  const getUserDepartments = (userId: string) => {
    return allUserDepartments.filter(ud => ud.user_id === userId);
  };

  const handleManageDepartments = (profile: ProfileWithRoles) => {
    setSelectedUser(profile);
    setIsDepartmentDialogOpen(true);
  };

  const handleManagePermissions = (profile: ProfileWithRoles) => {
    setSelectedUser(profile);
    setIsPermissionDialogOpen(true);
  };

  const handleDepartmentToggle = async (departmentId: string, isAssigned: boolean) => {
    if (!selectedUser) return;
    
    if (isAssigned) {
      await removeDepartment.mutateAsync({ userId: selectedUser.user_id, departmentId });
    } else {
      await assignDepartment.mutateAsync({ userId: selectedUser.user_id, departmentId });
    }
  };

  // Check if user needs department restrictions (data_entry, assistant, or tooling_maintenance)
  const needsDepartmentRestriction = (roles: AppRole[]) => {
    return roles.includes('data_entry') || 
           roles.includes('assistant') || 
           roles.includes('tooling_maintenance');
  };

  const { data: profiles = [], isLoading, error, refetch } = useProfiles();
  const { data: overridesSummary } = useUserOverridesSummary();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();

  // Role-based access detection
  const isAdmin = hasRole('admin');
  const isAssistant = hasRole('assistant') && !isAdmin;

  // Available roles for new user creation (assistants can only assign data_entry)
  const availableRolesForNewUser = useMemo(() => {
    if (isAssistant) return ['data_entry'] as AppRole[];
    return allRoles;
  }, [isAssistant]);

  // Pre-select data_entry role for assistants when opening Add User dialog
  useEffect(() => {
    if (isAssistant && isAddUserDialogOpen) {
      setNewUserRoles(['data_entry']);
    }
  }, [isAssistant, isAddUserDialogOpen]);

  // Check if assistant can manage this user (only data_entry users)
  const canAssistantManageUser = (profile: ProfileWithRoles) => {
    return profile.roles.includes('data_entry') && profile.roles.length === 1;
  };

  const handleEditRoles = (profile: ProfileWithRoles) => {
    setSelectedUser(profile);
    setPendingRoles([...profile.roles]);
    setIsRoleDialogOpen(true);
  };

  const handleChangePassword = (profile: ProfileWithRoles) => {
    setSelectedUser(profile);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordDialogOpen(true);
  };

  const handleEditUser = (profile: ProfileWithRoles) => {
    setSelectedUser(profile);
    setEditFullName(profile.full_name || '');
    setEditIsActive(profile.is_active !== false);
    setIsEditUserDialogOpen(true);
  };

  const handleViewActivity = (profile: ProfileWithRoles) => {
    setSelectedUser(profile);
    setIsActivityDialogOpen(true);
  };

  const handleRoleToggle = (role: AppRole) => {
    setPendingRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleNewUserRoleToggle = (role: AppRole) => {
    // Assistants can only select data_entry
    if (isAssistant && role !== 'data_entry') return;
    
    setNewUserRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    const currentRoles = selectedUser.roles;
    const rolesToAdd = pendingRoles.filter(r => !currentRoles.includes(r));
    const rolesToRemove = currentRoles.filter(r => !pendingRoles.includes(r));

    // Process all changes
    for (const role of rolesToAdd) {
      await assignRole.mutateAsync({ userId: selectedUser.user_id, role });
    }
    for (const role of rolesToRemove) {
      await removeRole.mutateAsync({ userId: selectedUser.user_id, role });
    }

    setIsRoleDialogOpen(false);
    setSelectedUser(null);
    setPendingRoles([]);
  };

  const handleSavePassword = async () => {
    if (!selectedUser) return;

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('change-password', {
        body: { userId: selectedUser.user_id, newPassword }
      });

      // Try to extract descriptive error from response body even on non-2xx
      let bodyError: string | undefined = data?.error;
      if (!bodyError && error) {
        const ctx: any = (error as any).context;
        try {
          if (ctx?.json) {
            const j = await ctx.json();
            bodyError = j?.error;
          } else if (ctx?.text) {
            const t = await ctx.text();
            try { bodyError = JSON.parse(t)?.error ?? t; } catch { bodyError = t; }
          }
        } catch { /* ignore parse errors */ }
      }

      if (bodyError) {
        toast.error(bodyError, { duration: 7000 });
        console.error('Password change error:', bodyError);
      } else if (error) {
        toast.error('Password change failed. ' + error.message, { duration: 7000 });
        console.error('Password change error:', error);
      } else {
        toast.success(`Password updated for ${extractUsername(selectedUser.email)}`);
        setIsPasswordDialogOpen(false);
        setSelectedUser(null);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error('Failed to change password');
      console.error('Password change error:', err);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || newUsername.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    if (!newUserPassword || newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsCreatingUser(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'create',
          username: newUsername,
          password: newUserPassword,
          fullName: newUserFullName || newUsername,
          roles: newUserRoles
        }
      });

      if (error) {
        toast.error('Failed to create user. ' + error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`User "${newUsername}" created successfully`);
        setIsAddUserDialogOpen(false);
        setNewUsername('');
        setNewUserPassword('');
        setNewUserFullName('');
        setNewUserRoles([]);
        refetch();
      }
    } catch (err) {
      toast.error('Failed to create user');
      console.error('Create user error:', err);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsUpdatingUser(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update',
          userId: selectedUser.user_id,
          fullName: editFullName,
          isActive: editIsActive
        }
      });

      if (error) {
        toast.error('Failed to update user. ' + error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success('User updated successfully');
        setIsEditUserDialogOpen(false);
        setSelectedUser(null);
        refetch();
      }
    } catch (err) {
      toast.error('Failed to update user');
      console.error('Update user error:', err);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleToggleActive = async (profile: ProfileWithRoles) => {
    const newStatus = profile.is_active === false ? true : false;

    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'toggle_active',
          userId: profile.user_id,
          isActive: newStatus
        }
      });

      if (error) {
        toast.error('Failed to update status');
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(newStatus ? 'User enabled' : 'User disabled');
        refetch();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;

    setIsDeletingUser(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'delete',
          userId: deleteConfirmUser.user_id
        }
      });

      if (error) {
        toast.error('Failed to delete user. ' + error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`User "${extractUsername(deleteConfirmUser.email)}" deleted successfully`);
        setDeleteConfirmUser(null);
        refetch();
      }
    } catch (err) {
      toast.error('Failed to delete user');
      console.error('Delete user error:', err);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const stats = {
    total: profiles.length,
    active: profiles.filter(p => p.is_active !== false).length,
    admins: profiles.filter(p => p.roles.includes('admin')).length,
    managers: profiles.filter(p => p.roles.includes('production_manager') || p.roles.includes('quality_manager')).length,
    operators: profiles.filter(p => p.roles.includes('operator')).length,
    assistants: profiles.filter(p => p.roles.includes('assistant')).length,
    dataEntry: profiles.filter(p => p.roles.includes('data_entry')).length,
  };

  // Filter profiles based on search
  const filteredProfiles = useMemo(() => {
    if (!searchFilter) return profiles;
    const selectedProfile = profiles.find(p => p.user_id === searchFilter);
    return selectedProfile ? [selectedProfile] : profiles;
  }, [profiles, searchFilter]);

  // Options for searchable combobox
  const userOptions: ComboBoxOption[] = useMemo(() => {
    return profiles.map(profile => ({
      value: profile.user_id,
      label: extractUsername(profile.email),
      description: profile.full_name || 'No full name set',
    }));
  }, [profiles]);

  // Username validation state
  const usernameValidation = validateUsername(newUsername);

  if (error) {
    return (
      <MainLayout title="User Management" subtitle="Manage user accounts and roles">
        <div className="text-center py-12">
          <p className="text-destructive">Error loading users: {error.message}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="User Management" subtitle={isAssistant ? "Create data entry users" : "Manage user accounts and roles"}>
      <RoleGuard allowedRoles={['admin', 'assistant']}>
        <div className="space-y-6 animate-fade-in">
          {/* Assistant Mode Banner */}
          {isAssistant && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              <AlertCircle size={16} />
              <span className="text-sm">
                <strong>Limited Access:</strong> You can only create new users with the Data Entry role.
              </span>
            </div>
          )}

          {/* Header with Add User button */}
          <div className="flex justify-between items-center">
            {/* Stats for Admin */}
            {isAdmin && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1 mr-4">
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <div className="bg-card rounded-xl border border-success/30 p-4 text-center">
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div className="bg-card rounded-xl border border-destructive/30 p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{stats.admins}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
                <div className="bg-card rounded-xl border border-primary/30 p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{stats.managers}</p>
                  <p className="text-sm text-muted-foreground">Managers</p>
                </div>
                <div className="bg-card rounded-xl border border-warning/30 p-4 text-center">
                  <p className="text-2xl font-bold text-warning">{stats.operators}</p>
                  <p className="text-sm text-muted-foreground">Operators</p>
                </div>
              </div>
            )}
            
            {/* Stats for Assistant - simplified */}
            {isAssistant && (
              <div className="grid grid-cols-2 gap-4 flex-1 mr-4">
                <div className="bg-card rounded-xl border border-purple-200 p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.dataEntry}</p>
                  <p className="text-sm text-muted-foreground">Data Entry Users</p>
                </div>
                <div className="bg-card rounded-xl border border-success/30 p-4 text-center">
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            )}
            
            <Button onClick={() => setIsAddUserDialogOpen(true)} className="gap-2">
              <Plus size={18} />
              Add User
            </Button>
          </div>

          {/* Search Filter */}
          <div className="flex items-center gap-4">
            <div className="w-80">
              <SearchableComboBox
                value={searchFilter}
                onChange={setSearchFilter}
                options={userOptions}
                placeholder="Search users..."
                searchPlaceholder="Type username or name..."
                emptyMessage="No users found"
                showClear={true}
              />
            </div>
            {searchFilter && (
              <p className="text-sm text-muted-foreground">
                Showing 1 of {profiles.length} users
              </p>
            )}
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Departments</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-48">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => {
                    const canManage = isAdmin || (isAssistant && canAssistantManageUser(profile));

                    return (
                    <TableRow key={profile.id} className={profile.is_active === false ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile.full_name || 'User'}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <User size={20} className="text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">
                                {profile.full_name || extractUsername(profile.email)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono">
                        {extractUsername(profile.email)}
                      </TableCell>
                      <TableCell>
                        {profile.is_active === false ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            <UserX size={12} className="mr-1" />
                            Disabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            <UserCheck size={12} className="mr-1" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {profile.roles.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No roles</span>
                          ) : (
                            profile.roles.map((role) => (
                              <Badge 
                                key={role} 
                                variant="outline"
                                className={cn('text-xs', roleConfig[role].color)}
                              >
                                {roleConfig[role].label}
                              </Badge>
                            ))
                          )}
                          {(() => {
                            const ovr = overridesSummary?.get(profile.user_id);
                            if (!ovr || ovr.modules.length === 0) return null;
                            const tip = `${ovr.modules.length} module(s) with custom permissions${ovr.nextExpiry ? ` · expires ${format(new Date(ovr.nextExpiry), 'PP p')}` : ''}`;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-primary/10 text-primary border-primary/30 gap-1"
                                    >
                                      <ShieldCheck size={10} />
                                      Custom · {ovr.modules.length}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[280px]">
                                    {tip}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const userDepts = getUserDepartments(profile.user_id);
                          const needsRestriction = needsDepartmentRestriction(profile.roles);
                          
                          if (userDepts.length === 0) {
                            return needsRestriction ? (
                              <span className="text-xs text-destructive">Not assigned</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">All access</span>
                            );
                          }
                          
                          return (
                            <div className="flex flex-wrap gap-1">
                              {userDepts.map((ud) => (
                                <Badge 
                                  key={ud.id} 
                                  variant="outline"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  <Building2 size={10} className="mr-1" />
                                  {ud.department?.code || 'Unknown'}
                                </Badge>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(profile.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Admin-only actions */}
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(profile)}
                                title="Edit User"
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRoles(profile)}
                                title="Manage Roles"
                              >
                                <Shield size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChangePassword(profile)}
                                title="Change Password"
                              >
                                <Key size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewActivity(profile)}
                                title="View Activity"
                              >
                                <History size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleManagePermissions(profile)}
                                title="Edit Permissions"
                              >
                                <ShieldCheck size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenCopyDialog(profile)}
                                title="Copy User (clone roles & permissions)"
                              >
                                <Copy size={14} />
                              </Button>
                              {needsDepartmentRestriction(profile.roles) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleManageDepartments(profile)}
                                  title="Manage Departments"
                                >
                                  <Building2 size={14} />
                                </Button>
                              )}
                              {user?.id !== profile.user_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirmUser(profile)}
                                  title="Delete User"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </>
                          )}
                          
                          {/* Assistant can only change password and manage departments for data_entry users */}
                          {isAssistant && canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleChangePassword(profile)}
                                title="Change Password"
                              >
                                <Key size={14} />
                              </Button>
                              {needsDepartmentRestriction(profile.roles) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleManageDepartments(profile)}
                                  title="Manage Departments"
                                >
                                  <Building2 size={14} />
                                </Button>
                              )}
                            </>
                          )}
                          
                          {/* Show nothing for assistants viewing non-data_entry users */}
                          {isAssistant && !canManage && (
                            <span className="text-xs text-muted-foreground px-2">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          )}

          {/* Add User Dialog */}
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isAssistant ? 'Add Data Entry User' : 'Add New User'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUsername">Username *</Label>
                    <div className="relative">
                      <Input
                        id="newUsername"
                        placeholder="Enter username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className={cn(
                          "pr-10",
                          newUsername && !usernameValidation.isValidChars && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {newUsername && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameValidation.isValid ? (
                            <Check size={16} className="text-success" />
                          ) : (
                            <X size={16} className="text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Allowed: letters, numbers, underscore (_) and hyphen (-)
                    </p>
                    {newUsername && !usernameValidation.isValidChars && (
                      <p className="text-xs text-destructive">
                        Invalid characters detected
                      </p>
                    )}
                    {newUsername && usernameValidation.isValidChars && !usernameValidation.isValidLength && (
                      <p className="text-xs text-destructive">
                        Username must be at least 3 characters
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newUserFullName">Full Name</Label>
                    <Input
                      id="newUserFullName"
                      placeholder="Enter full name"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newUserPassword">Password *</Label>
                  <div className="relative">
                    <Input
                      id="newUserPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Assign Roles</Label>
                  {isAssistant && (
                    <p className="text-xs text-muted-foreground">
                      You can only assign the Data Entry role.
                    </p>
                  )}
                  {availableRolesForNewUser.map((role) => (
                    <div
                      key={role}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        newUserRoles.includes(role) 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-border hover:bg-muted/50',
                        isAssistant && role === 'data_entry' && 'cursor-default'
                      )}
                      onClick={() => handleNewUserRoleToggle(role)}
                    >
                      <Checkbox
                        id={`new-${role}`}
                        checked={newUserRoles.includes(role)}
                        onCheckedChange={() => handleNewUserRoleToggle(role)}
                        className="mt-0.5"
                        disabled={isAssistant && role === 'data_entry'}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`new-${role}`} className="cursor-pointer">
                          <span className="font-medium text-foreground">{roleConfig[role].label}</span>
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {roleConfig[role].description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                    {isCreatingUser && <Loader2 size={16} className="mr-2 animate-spin" />}
                    Create User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Copy User Dialog - Admin only */}
          {isAdmin && (
            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Copy size={18} />
                    Copy User
                  </DialogTitle>
                </DialogHeader>
                {copySourceUser && (
                  <div className="space-y-5 mt-4">
                    <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-2">
                      <p className="text-xs text-muted-foreground">Cloning from</p>
                      <p className="font-medium text-foreground">
                        {copySourceUser.full_name || extractUsername(copySourceUser.email)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({extractUsername(copySourceUser.email)})
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {copySourceUser.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No roles</span>
                        ) : (
                          copySourceUser.roles.map((r) => (
                            <Badge key={r} variant="outline" className={cn('text-xs', roleConfig[r].color)}>
                              {roleConfig[r].label}
                            </Badge>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {copySourceOverrides.length > 0
                          ? `${copySourceOverrides.length} module(s) with custom permission overrides`
                          : 'No custom permission overrides (uses role defaults)'}
                      </p>
                      {copySourceOverrides.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {copySourceOverrides.map((o) => {
                            const label = MODULES.find((m) => m.id === o.module)?.label || o.module;
                            return (
                              <Badge key={o.module} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {label}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="copyUsername">New Username *</Label>
                        <div className="relative">
                          <Input
                            id="copyUsername"
                            placeholder="Enter username"
                            value={copyUsername}
                            onChange={(e) => setCopyUsername(e.target.value)}
                            className={cn(
                              'pr-10',
                              copyUsername && !copyUsernameValidation.isValidChars && 'border-destructive focus-visible:ring-destructive'
                            )}
                          />
                          {copyUsername && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {copyUsernameValidation.isValid ? (
                                <Check size={16} className="text-success" />
                              ) : (
                                <X size={16} className="text-destructive" />
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Letters, numbers, _ and - only
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="copyFullName">Full Name</Label>
                        <Input
                          id="copyFullName"
                          placeholder="Enter full name"
                          value={copyFullName}
                          onChange={(e) => setCopyFullName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="copyPassword">Password *</Label>
                      <div className="relative">
                        <Input
                          id="copyPassword"
                          type={showCopyPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={copyPassword}
                          onChange={(e) => setCopyPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCopyPassword(!showCopyPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCopyPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        copyIncludeOverrides ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/50'
                      )}
                      onClick={() => setCopyIncludeOverrides(!copyIncludeOverrides)}
                    >
                      <Checkbox
                        id="copyIncludeOverrides"
                        checked={copyIncludeOverrides}
                        onCheckedChange={(c) => setCopyIncludeOverrides(!!c)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label htmlFor="copyIncludeOverrides" className="cursor-pointer font-medium">
                          Copy permission overrides
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          When ON, the new user gets the same per-module overrides
                          (e.g. view-only for Inventory). When OFF, only roles are copied
                          and the user falls back to default role permissions.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800">
                        After creation, the new user will have <strong>identical access</strong> to{' '}
                        <strong>{extractUsername(copySourceUser.email)}</strong> — no need to re-verify
                        each module. Open the Permissions dialog later only if you want to differ.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCopyUser} disabled={isCopyingUser}>
                        {isCopyingUser && <Loader2 size={16} className="mr-2 animate-spin" />}
                        <Copy size={14} className="mr-2" />
                        Create Copy
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          {/* Edit User Dialog - Admin only */}
          {isAdmin && (
            <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                </DialogHeader>
                {selectedUser && (
                  <div className="space-y-6 mt-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User size={24} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedUser.full_name || extractUsername(selectedUser.email)}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {extractUsername(selectedUser.email)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="editFullName">Full Name</Label>
                        <Input
                          id="editFullName"
                          placeholder="Enter full name"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <Label htmlFor="editIsActive" className="text-foreground">Active Status</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Inactive users cannot login
                          </p>
                        </div>
                        <Switch
                          id="editIsActive"
                          checked={editIsActive}
                          onCheckedChange={setEditIsActive}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
                        {isUpdatingUser && <Loader2 size={16} className="mr-2 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          {/* View Activity Dialog - Admin only */}
          {isAdmin && (
            <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <History size={20} />
                    User Activity Log
                  </DialogTitle>
                </DialogHeader>
                {selectedUser && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User size={24} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedUser.full_name || extractUsername(selectedUser.email)}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {extractUsername(selectedUser.email)}
                        </p>
                      </div>
                    </div>
                    
                    <UserActivityLog userId={selectedUser.user_id} />
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          {/* Role Management Dialog - Admin only */}
          {isAdmin && (
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield size={20} />
                    Manage Roles
                  </DialogTitle>
                </DialogHeader>
                {selectedUser && (
                  <div className="space-y-6 mt-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User size={24} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedUser.full_name || extractUsername(selectedUser.email)}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {extractUsername(selectedUser.email)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {allRoles.map((role) => (
                        <div
                          key={role}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                            pendingRoles.includes(role) 
                              ? 'border-primary/50 bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          )}
                          onClick={() => handleRoleToggle(role)}
                        >
                          <Checkbox
                            id={role}
                            checked={pendingRoles.includes(role)}
                            onCheckedChange={() => handleRoleToggle(role)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <Label htmlFor={role} className="cursor-pointer">
                              <span className="font-medium text-foreground">{roleConfig[role].label}</span>
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {roleConfig[role].description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedUser && (
                      <UserCustomRolesSection userId={selectedUser.user_id} />
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveRoles}
                        disabled={assignRole.isPending || removeRole.isPending}
                      >
                        {(assignRole.isPending || removeRole.isPending) && (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          {/* Password Change Dialog */}
          <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-6 mt-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {selectedUser.full_name || extractUsername(selectedUser.email)}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {extractUsername(selectedUser.email)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Min 8 chars. Avoid common words, the user's name, or passwords found in known data breaches.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSavePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword && (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      )}
                      Update Password
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Department Assignment Dialog */}
          <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 size={20} />
                  Assign Departments
                </DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-6 mt-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {selectedUser.full_name || extractUsername(selectedUser.email)}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {extractUsername(selectedUser.email)}
                      </p>
                    </div>
                  </div>

                  {needsDepartmentRestriction(selectedUser.roles) && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                      <strong>Note:</strong> This user has a role that requires department restrictions. 
                      Select which departments they can access.
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Select departments this user can access:
                    </Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {departments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No departments available. Create departments first.
                        </p>
                      ) : (
                        departments.filter(d => d.is_active).map((dept) => {
                          const isAssigned = selectedUserDepartments.some(
                            ud => ud.department_id === dept.id
                          );
                          const isLoadingDept = 
                            (assignDepartment.isPending || removeDepartment.isPending);

                          return (
                            <div
                              key={dept.id}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                                isAssigned 
                                  ? 'border-primary/50 bg-primary/5' 
                                  : 'border-border hover:bg-muted/50',
                                isLoadingDept && 'opacity-50 pointer-events-none'
                              )}
                              onClick={() => handleDepartmentToggle(dept.id, isAssigned)}
                            >
                              <Checkbox
                                id={`dept-${dept.id}`}
                                checked={isAssigned}
                                onCheckedChange={() => handleDepartmentToggle(dept.id, isAssigned)}
                                disabled={isLoadingDept}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`dept-${dept.id}`} className="cursor-pointer">
                                  <span className="font-medium text-foreground">{dept.code}</span>
                                  <span className="text-muted-foreground ml-2">- {dept.name}</span>
                                </Label>
                                {dept.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {dept.description}
                                  </p>
                                )}
                              </div>
                              {isAssigned && (
                                <Check size={16} className="text-primary" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {selectedUserDepartments.length} department{selectedUserDepartments.length !== 1 ? 's' : ''} assigned
                    </p>
                    <Button variant="outline" onClick={() => setIsDepartmentDialogOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete User Confirmation - Admin only */}
          {isAdmin && (
            <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete user <strong>{extractUsername(deleteConfirmUser?.email || '')}</strong>?
                    This action cannot be undone. The user will lose access to the system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingUser}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteUser} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeletingUser}
                  >
                    {isDeletingUser ? (
                      <>
                        <Loader2 size={14} className="mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete User'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* User Permission Dialog */}
          {selectedUser && selectedUser.roles.length > 0 && (
            <UserPermissionDialog
              open={isPermissionDialogOpen}
              onOpenChange={setIsPermissionDialogOpen}
              userId={selectedUser.user_id}
              userName={selectedUser.full_name || extractUsername(selectedUser.email)}
              userRole={selectedUser.roles[0]}
            />
          )}
        </div>
      </RoleGuard>
    </MainLayout>
  );
}