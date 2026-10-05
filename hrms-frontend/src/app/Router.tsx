import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { toast } from '../stores/useToastStore';
import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { AppShell } from '../components/layout/AppShell';
import { Login } from '../features/auth/Login';
import { Register } from '../features/auth/Register';
import { AdminDashboard } from '../features/dashboard/AdminDashboard';
import { EmployeeDashboard } from '../features/dashboard/EmployeeDashboard';
import EventCalendar from '../features/events/EventCalendar';
import { EmployeeList } from '../features/employees/EmployeeList';
import { EmployeeDetail } from '../features/employees/EmployeeDetail';
import { Attendance } from '../features/attendance/Attendance';
import { Leave } from '../features/leave/Leave';
import { Payroll } from '../features/payroll/Payroll';
import { Security } from '../features/security/Security';
import { Profile } from '../features/profile/Profile';
import { Settings } from '../features/settings/Settings';
import { SocialFeed } from '../features/social/SocialFeed';
import { Onboarding } from '../features/onboarding/Onboarding';
import { BlockedWarning } from '../features/security/BlockedWarning';
import { InternalChat } from '../features/chat/InternalChat';
import { ExplanationForm } from '../features/attendance/ExplanationForm';
import { PolicyManagement } from '../features/policies/PolicyManagement';
import { AITools } from '../features/ai-tools/AITools';
import { DocumentsPage } from '../features/documents/pages/DocumentsPage';
function FeatureRoute({ featureKey, defaultEnabled = true }: { featureKey: string, defaultEnabled?: boolean }) {
  const { settings } = useSettingsStore();
  const navigate = useNavigate();

  const isEnabled = settings[featureKey] !== undefined 
    ? settings[featureKey] === 'true' 
    : defaultEnabled;

  useEffect(() => {
    if (Object.keys(settings).length > 0 && !isEnabled) {
      toast.error('Tính năng này đã bị tắt bởi quản trị viên');
      navigate('/');
    }
  }, [settings, isEnabled, navigate]);

  if (Object.keys(settings).length > 0 && !isEnabled) return null;

  return <Outlet />;
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function DashboardRouter() {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase().replace(' ', '_') || 'employee';
  
  if (role === 'employee') return <EmployeeDashboard />;
  return <AdminDashboard />;
}

// Role Protected Route Component
function RoleProtectedRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role?.toLowerCase().replace(' ', '_') || 'employee';
  const hasAccess = allowedRoles.includes(role);

  useEffect(() => {
    if (!hasAccess) {
      toast.error('Lỗi phân quyền', 'Bạn không có quyền truy cập trang này!');
    }
  }, [hasAccess]);

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function PublicRoute() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      
      <Route path="/blocked-warning" element={<BlockedWarning />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/feed" element={<SocialFeed />} />

        <Route element={<FeatureRoute featureKey="ENABLE_ATTENDANCE" />}>
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/explanation/:id" element={<ExplanationForm />} />
        </Route>

        <Route element={<FeatureRoute featureKey="ENABLE_LEAVE" />}>
          <Route path="/leave" element={<Leave />} />
        </Route>

        <Route element={<FeatureRoute featureKey="ENABLE_PAYROLL" />}>
          <Route path="/payroll" element={<Payroll />} />
        </Route>

        <Route element={<FeatureRoute featureKey="ENABLE_ONBOARDING" defaultEnabled={false} />}>
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        <Route element={<FeatureRoute featureKey="ENABLE_CHAT" />}>
          <Route path="/chat" element={<InternalChat />} />
        </Route>

        <Route element={<FeatureRoute featureKey="ENABLE_EVENTS" />}>
          <Route path="/events" element={<EventCalendar />} />
        </Route>

        <Route element={<FeatureRoute featureKey="ENABLE_POLICIES" />}>
          <Route path="/policies" element={<PolicyManagement />} />
        </Route>

        <Route path="/ai-tools" element={<AITools />} />
        <Route path="/documents" element={<DocumentsPage />} />
      </Route>

      {/* Admin, HR Manager, Department Manager Only */}
      <Route element={<RoleProtectedRoute allowedRoles={['admin', 'hr_manager', 'department_manager']} />}>
        <Route element={<FeatureRoute featureKey="ENABLE_EMPLOYEES" />}>
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/employees/:id" element={<EmployeeDetail />} />
        </Route>
      </Route>

      {/* Admin Only */}
      <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/security" element={<Security />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
