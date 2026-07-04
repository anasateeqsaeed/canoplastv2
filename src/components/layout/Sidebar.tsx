import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { pathToModule } from '@/lib/routeModuleMap';
import {
  Factory,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  TrendingUp,
  Calculator,
  Users,
  Wrench,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Boxes,
  LogOut,
  Database,
  Hammer,
  FlaskConical,
  FileBarChart,
  BookOpen,
} from 'lucide-react';

interface NavLeaf {
  label: string;
  path: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: NavLeaf[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
  {
    label: 'Master Data',
    path: '/masters',
    icon: <Database size={20} />,
    children: [
      { label: 'Departments', path: '/masters/departments' },
      { label: 'Units of Measure', path: '/masters/units-of-measure' },
      { label: 'Delivery Terms', path: '/masters/delivery-terms' },
      { label: 'Payment Terms', path: '/masters/payment-terms' },
      { label: 'Clients', path: '/masters/clients' },
      { label: 'Suppliers', path: '/masters/suppliers' },
      { label: 'Materials', path: '/masters/materials' },
      { label: 'Products', path: '/masters/products' },
    ],
  },
  {
    label: 'HR & Payroll',
    path: '/hr',
    icon: <Users size={20} />,
    children: [
      { label: 'Dashboard', path: '/hr' },
      { label: 'Employees', path: '/hr/employees' },
      { label: 'Attendance', path: '/hr/attendance' },
      { label: 'Payroll', path: '/hr/payroll' },
      { label: 'Leave Management', path: '/hr/leave' },
      { label: 'Shift Patterns', path: '/hr/shift-patterns' },
      { label: 'Audit Trail', path: '/hr/audit-log' },
    ],
  },
  {
    label: 'Purchase',
    path: '/purchase',
    icon: <ShoppingCart size={20} />,
    children: [
      { label: 'Purchase Orders', path: '/purchase/orders' },
      { label: 'GRN', path: '/purchase/grn' },
    ],
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: <Boxes size={20} />,
    children: [
      { label: 'Store Dashboard', path: '/inventory' },
      { label: 'Stock Ledger', path: '/inventory/stock-ledger' },
      { label: 'Dispatch', path: '/inventory/dispatch' },
    ],
  },
  {
    label: 'Sales',
    path: '/sales',
    icon: <TrendingUp size={20} />,
    children: [
      { label: 'Quotations', path: '/sales/quotations' },
      { label: 'Sales Orders', path: '/sales/orders' },
      { label: 'Invoices', path: '/sales/invoices' },
    ],
  },
  {
    label: 'Accounting',
    path: '/accounting',
    icon: <BookOpen size={20} />,
    children: [
      { label: 'Overview', path: '/accounting' },
      { label: 'Chart of Accounts', path: '/accounting/chart-of-accounts' },
      { label: 'Journal Entries', path: '/accounting/journal-entries' },
      { label: 'Receivables', path: '/accounting/receivables' },
      { label: 'Payables', path: '/accounting/payables' },
      { label: 'Bank', path: '/accounting/bank' },
      { label: 'Reports', path: '/accounting/reports' },
    ],
  },
  {
    label: 'Production',
    path: '/production',
    icon: <Factory size={20} />,
    children: [
      { label: 'Overview', path: '/production' },
      { label: 'Job Cards', path: '/production/jobs' },
      { label: 'Hourly Entry', path: '/production/hourly-entry' },
    ],
  },
  {
    label: 'Quality',
    path: '/quality',
    icon: <ClipboardCheck size={20} />,
    children: [{ label: 'Inspections', path: '/quality/inspections' }],
  },
  {
    label: 'Maintenance',
    path: '/maintenance',
    icon: <Wrench size={20} />,
    children: [
      { label: 'Dashboard', path: '/maintenance' },
      { label: 'Work Orders', path: '/maintenance/work-orders' },
      { label: 'Daily Checklist', path: '/maintenance/daily-checklist' },
    ],
  },
  {
    label: 'Mixing',
    path: '/mixing',
    icon: <FlaskConical size={20} />,
    children: [
      { label: 'Injection', path: '/mixing/injection' },
      { label: 'Blow', path: '/mixing/blow' },
    ],
  },
  {
    label: 'Tooling Shop',
    path: '/tooling',
    icon: <Hammer size={20} />,
    children: [{ label: 'Dashboard', path: '/tooling' }],
  },
  {
    label: 'Operational Finance',
    path: '/finance',
    icon: <Calculator size={20} />,
    children: [
      { label: 'Expense Dashboard', path: '/finance' },
      { label: 'Petty Cash Ledger', path: '/finance/ledger' },
      { label: 'Advance Ledger', path: '/finance/advances' },
      { label: 'Investors', path: '/finance/investors' },
    ],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <FileBarChart size={20} />,
    children: [{ label: 'Report Centre', path: '/reports' }],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <Settings size={20} />,
    children: [
      { label: 'General', path: '/settings' },
      { label: 'User Management', path: '/settings/users' },
      { label: 'Role Management', path: '/settings/roles' },
      { label: 'Employee Types', path: '/settings/employee-types' },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Master Data']);
  const location = useLocation();
  const { user, roles, rolesLoading, signOut } = useAuth();
  const { canViewModule, isAdmin } = useMyPermissions();
  const navigate = useNavigate();

  const username = user?.email?.split('@')[0] || 'User';
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  const initials = displayName.substring(0, 2).toUpperCase();

  const getFilteredNavItems = (): NavItem[] => {
    if (roles.length === 0) return [];
    if (isAdmin) return navItems;

    return navItems
      .map((item) => {
        if (item.path === '/') return item;
        if (item.children && item.children.length > 0) {
          const visibleChildren = item.children.filter((c) => canViewModule(pathToModule(c.path)));
          if (visibleChildren.length === 0) return null;
          return { ...item, children: visibleChildren };
        }
        return canViewModule(pathToModule(item.path)) ? item : null;
      })
      .filter((x): x is NavItem => x !== null);
  };

  const filteredNavItems = getFilteredNavItems();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
      return;
    }
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => (prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]));
  };

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64',
        'max-md:-translate-x-full max-md:data-[open=true]:translate-x-0'
      )}
      data-open={isOpen}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Factory size={18} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Canoplast ERP</span>
          </div>
        )}
        <button
          onClick={() => {
            if (window.innerWidth < 768 && onClose) {
              onClose();
            } else {
              setCollapsed(!collapsed);
            }
          }}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {rolesLoading ? (
          <div className="space-y-2 px-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-sidebar-accent/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          filteredNavItems.map((item) => (
            <div key={item.label} className="mb-1">
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive(item.path)
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <span className={cn(isActive(item.path) && 'text-sidebar-primary')}>{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {expandedItems.includes(item.label) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </>
                    )}
                  </button>
                  {!collapsed && expandedItems.includes(item.label) && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            cn(
                              'block px-3 py-2 rounded-lg text-sm transition-all',
                              isActive
                                ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )
                  }
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )}
            </div>
          ))
        )}
      </nav>

      {!collapsed && user && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {roles.length > 0 ? roles.join(', ') : 'No role'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
