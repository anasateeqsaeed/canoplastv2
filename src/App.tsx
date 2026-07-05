import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRedirect } from '@/components/auth/RoleBasedRedirect';
import { DashboardSwitcher } from '@/components/auth/DashboardSwitcher';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';
import ComingSoon from '@/pages/ComingSoon';
import RoleManagement from '@/pages/settings/RoleManagement';
import UserManagement from '@/pages/settings/UserManagement';
import DepartmentMaster from '@/pages/masters/DepartmentMaster';
import UnitsOfMeasureMaster from '@/pages/masters/UnitsOfMeasureMaster';
import DeliveryTermsMaster from '@/pages/masters/DeliveryTermsMaster';
import PaymentTermsMaster from '@/pages/masters/PaymentTermsMaster';
import MasterDataIndex from '@/pages/masters/MasterDataIndex';
import ClientMaster from '@/pages/masters/ClientMaster';
import SupplierMaster from '@/pages/masters/SupplierMaster';
import MaterialMaster from '@/pages/masters/MaterialMaster';
import PurchaseOrders from '@/pages/purchase/PurchaseOrders';
import StoreDashboard from '@/pages/inventory/StoreDashboard';
import StoreMaster from '@/pages/inventory/StoreMaster';
import StoreRequisitions from '@/pages/inventory/StoreRequisitions';
import StockPosition from '@/pages/inventory/StockPosition';
import MaterialIssue from '@/pages/inventory/MaterialIssue';
import MaterialReturn from '@/pages/inventory/MaterialReturn';
import MaterialGRN from '@/pages/inventory/MaterialGRN';
import RawMaterialStock from '@/pages/inventory/RawMaterialStock';
import StockAdjustmentLog from '@/pages/inventory/StockAdjustmentLog';
import EmployeeTypes from '@/pages/settings/EmployeeTypes';
import HRDashboard from '@/pages/hr/HRDashboard';
import Employees from '@/pages/hr/Employees';
import Attendance from '@/pages/hr/Attendance';
import Payroll from '@/pages/hr/Payroll';
import Leave from '@/pages/hr/Leave';
import ShiftPatterns from '@/pages/hr/ShiftPatterns';
import HRAuditLog from '@/pages/hr/HRAuditLog';

import '@/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

// Every module below is a wildcard ComingSoon stub until its build phase lands.
// Specific routes registered ahead of a wildcard (e.g. /masters/departments)
// take priority — React Router v6 ranks explicit segments over splats.
const stubModules: Array<{ prefix: string; title: string; subtitle: string }> = [
  { prefix: '/sales', title: 'Sales', subtitle: 'Phase 3' },
  { prefix: '/accounting', title: 'Accounting', subtitle: 'Phase 4' },
  { prefix: '/production', title: 'Production', subtitle: 'Phase 5' },
  { prefix: '/quality', title: 'Quality', subtitle: 'Phase 5' },
  { prefix: '/maintenance', title: 'Maintenance', subtitle: 'Phase 5' },
  { prefix: '/mixing', title: 'Mixing', subtitle: 'Phase 5' },
  { prefix: '/tooling', title: 'Tooling Shop', subtitle: 'Phase 5' },
  { prefix: '/finance', title: 'Operational Finance', subtitle: 'Phase 6' },
  { prefix: '/reports', title: 'Reports', subtitle: 'Phase 7' },
  { prefix: '/operator', title: 'Operator', subtitle: 'Phase 5' },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RoleBasedRedirect>
              <Routes>
                <Route path="/auth" element={<Auth />} />

                <Route path="/" element={<ProtectedRoute><DashboardSwitcher /></ProtectedRoute>} />

                <Route path="/masters" element={<ProtectedRoute><MasterDataIndex /></ProtectedRoute>} />
                <Route path="/masters/departments" element={<ProtectedRoute><DepartmentMaster /></ProtectedRoute>} />
                <Route path="/masters/units-of-measure" element={<ProtectedRoute><UnitsOfMeasureMaster /></ProtectedRoute>} />
                <Route path="/masters/delivery-terms" element={<ProtectedRoute><DeliveryTermsMaster /></ProtectedRoute>} />
                <Route path="/masters/payment-terms" element={<ProtectedRoute><PaymentTermsMaster /></ProtectedRoute>} />
                <Route path="/masters/clients" element={<ProtectedRoute><ClientMaster /></ProtectedRoute>} />
                <Route path="/masters/suppliers" element={<ProtectedRoute><SupplierMaster /></ProtectedRoute>} />
                <Route path="/masters/materials" element={<ProtectedRoute><MaterialMaster /></ProtectedRoute>} />
                <Route path="/masters/*" element={<ProtectedRoute><ComingSoon title="Master Data" subtitle="Landing across Phases 0-5" /></ProtectedRoute>} />

                {/* Purchase (Phase 2) */}
                <Route path="/purchase" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
                <Route path="/purchase/orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
                <Route path="/purchase/suppliers" element={<ProtectedRoute><SupplierMaster /></ProtectedRoute>} />
                <Route path="/purchase/grn" element={<ProtectedRoute><MaterialGRN /></ProtectedRoute>} />
                <Route path="/purchase/*" element={<ProtectedRoute><ComingSoon title="Purchase" subtitle="Coming in Phase 3/5" /></ProtectedRoute>} />

                {/* Inventory (Phase 2) */}
                <Route path="/inventory" element={<ProtectedRoute><StoreDashboard /></ProtectedRoute>} />
                <Route path="/inventory/store-master" element={<ProtectedRoute><StoreMaster /></ProtectedRoute>} />
                <Route path="/inventory/requisitions" element={<ProtectedRoute><StoreRequisitions /></ProtectedRoute>} />
                <Route path="/inventory/stock-position" element={<ProtectedRoute><StockPosition /></ProtectedRoute>} />
                <Route path="/inventory/material-issue" element={<ProtectedRoute><MaterialIssue /></ProtectedRoute>} />
                <Route path="/inventory/material-return" element={<ProtectedRoute><MaterialReturn /></ProtectedRoute>} />
                <Route path="/inventory/material-grn" element={<ProtectedRoute><MaterialGRN /></ProtectedRoute>} />
                <Route path="/inventory/raw-materials" element={<ProtectedRoute><RawMaterialStock /></ProtectedRoute>} />
                <Route path="/inventory/rm-stock" element={<ProtectedRoute><RawMaterialStock /></ProtectedRoute>} />
                <Route path="/inventory/stock-adjustment-log" element={<ProtectedRoute><StockAdjustmentLog /></ProtectedRoute>} />
                <Route path="/inventory/*" element={<ProtectedRoute><ComingSoon title="Inventory" subtitle="Coming in Phase 3/5" /></ProtectedRoute>} />

                <Route path="/settings" element={<ProtectedRoute><ComingSoon title="Settings" subtitle="General settings" /></ProtectedRoute>} />
                <Route path="/settings/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                <Route path="/settings/roles" element={<ProtectedRoute><RoleManagement /></ProtectedRoute>} />
                <Route path="/settings/employee-types" element={<ProtectedRoute><EmployeeTypes /></ProtectedRoute>} />
                <Route path="/settings/*" element={<ProtectedRoute><ComingSoon title="Settings" subtitle="Coming in a later phase" /></ProtectedRoute>} />

                <Route path="/hr" element={<ProtectedRoute><HRDashboard /></ProtectedRoute>} />
                <Route path="/hr/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
                <Route path="/hr/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
                <Route path="/hr/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
                <Route path="/hr/leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />
                <Route path="/hr/shift-patterns" element={<ProtectedRoute><ShiftPatterns /></ProtectedRoute>} />
                <Route path="/hr/audit-log" element={<ProtectedRoute><HRAuditLog /></ProtectedRoute>} />

                {stubModules.map((m) => (
                  <Route
                    key={m.prefix}
                    path={`${m.prefix}/*`}
                    element={<ProtectedRoute><ComingSoon title={m.title} subtitle={m.subtitle} /></ProtectedRoute>}
                  />
                ))}

                <Route path="*" element={<NotFound />} />
              </Routes>
            </RoleBasedRedirect>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
