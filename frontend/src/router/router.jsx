// src/router/router.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, getLandingRouteForPermissions, NAV_ITEMS } from '../context/AuthContext';
import { Toaster } from 'react-hot-toast';
import AdminLayout from '../layouts/AdminLayout';
import CustomerLayout from '../layouts/CustomerLayout';

// Admin pages
import Dashboard from '../pages/admin/Dashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import SalesDashboard from '../pages/admin/SalesDashboard';
import Inventory from '../pages/admin/Inventory';
import Orders from '../pages/admin/Orders';
import Deliveries from '../pages/admin/Deliveries';
import Reports from '../pages/admin/Reports';
import UserManagement from '../pages/admin/UserManagement';
import Settings from '../pages/admin/Settings';
import SettingsRequests from '../pages/admin/SettingsRequests';
import Employees from '../pages/admin/Employees';
import HrmDashboard from '../pages/admin/HrmDashboard';
import HRM from '../pages/admin/HRM';
import Vendors from '../pages/admin/Vendors';
import Customers from '../pages/admin/Customers';
import Finance from '../pages/admin/Finance';
import Products from '../pages/admin/Products';
import Messages from '../pages/admin/Messages';
import ManagePermissions from '../pages/admin/ManagePermissions';
import AdminOrderDetails from '../pages/admin/OrderDetails';
import RiderDashboard from '../pages/admin/RiderDashboard';
import ExpenseManagement from '../pages/admin/ExpenseManagement';
import ExpenseComparison from '../pages/admin/ExpenseComparison';
import POS from '../pages/admin/POS';
import TwoFactorSetup from "../pages/admin/TwoFactorSetup";
import TwoFactorVerify from "../pages/admin/TwoFactorVerify";
import Attendance from "../pages/admin/Attendance";
import SalariesOT from "../pages/admin/SalariesOT";
import Leave from "../pages/admin/Leave";
import DeliveryConfiguration from '../pages/admin/DeliveryConfiguration';
import InvoicingReports from "../pages/admin/InvoicingReports";
import ProfitReport from "../pages/admin/ProfitReport";
import InventoryDashboard from "../pages/admin/InventoryDashboard";
import JITDashboard from "../pages/admin/JITDashboard";
import DemandForecastDashboard from "../pages/admin/DemandForecasting";
import AllOrders from '../pages/admin/AllOrders';
import RecentlyRegistered from '../pages/admin/RecentlyRegistered';
import SystemActivity from '../pages/admin/SystemActivity';
import SalesAnalytics from '../pages/admin/salesAnalytics';

// Auth pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import AuthCallback from '../pages/auth/AuthCallback';

// Customer pages
import Home from '../pages/customer/Home';
import Services from '../pages/customer/Services';
import AboutUs from '../pages/customer/AboutUs';
import ContactUs from '../pages/customer/ContactUs';
import CustomerOrders from '../pages/customer/Orders';
import OrderTracking from '../pages/customer/OrderTracking';
import Profile from '../pages/customer/Profile';
import CustomerOrderDetails from '../pages/customer/OrderDetails';
import PaymentResult from '../pages/customer/PaymentResult';
import PaymentCancel from '../pages/customer/PaymentCancel';
import ForgotPassword from '../pages/customer/ForgotPassword';
import ResetPassword from '../pages/customer/ResetPassword';

// ==================== GUEST ROUTE ====================
function GuestRoute() {
  const { user, loading, permissions } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    const role = user.role?.toUpperCase();
    if (role === 'CUSTOMER') return <Navigate to="/" replace />;
    return <Navigate to={getLandingRouteForPermissions(permissions)} replace />;
  }

  return <Outlet />;
}

// ==================== ADMIN ROUTES ====================
function AdminRoutes() {
  const { user, permissions, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect on root or unauthorized paths (safety net)
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const currentPath = window.location.pathname;
    const allowedPaths = NAV_ITEMS
      .filter(item => permissions.includes(item.id))
      .map(item => item.path);

    const isRoot = currentPath === '/app' || currentPath === '/app/';
    const isAllowed = allowedPaths.some(path => currentPath.startsWith(path));

    if (isRoot || !isAllowed) {
      const target = getLandingRouteForPermissions(permissions);
      navigate(target, { replace: true });
    }
  }, [loading, user, permissions, navigate]);

  const role = user?.role?.toUpperCase();

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* Dashboard route – only if 'dashboard' permission exists */}
        <Route
          path="dashboard"
          element={
            permissions.includes('dashboard')
              ? (role === 'ADMIN' ? <AdminDashboard /> : <Dashboard />)
              : <Navigate to={getLandingRouteForPermissions(permissions)} replace />
          }
        />

        {/* All other routes (no permission checks – handled by useEffect) */}
        <Route path="sales-dashboard" element={<SalesDashboard />} />
        <Route path="inventory-dashboard" element={<InventoryDashboard />} />
        <Route path="demandforecast-dashboard" element={<DemandForecastDashboard />} />
        <Route path="jit-dashboard" element={<JITDashboard />} />
        <Route path="hrm-dashboard" element={<HrmDashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<AdminOrderDetails />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="reports" element={<Reports />} />
        <Route path="user-management" element={<UserManagement />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings-requests" element={<SettingsRequests />} />
        <Route path="employees" element={<Employees />} />
        <Route path="hrm" element={<HRM />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="customers" element={<Customers />} />
        <Route path="finance" element={<Finance />} />
        <Route path="finance/invoicing-reports" element={<InvoicingReports />} />
        <Route path="finance/profit-reports" element={<ProfitReport />} />
        <Route path="finance/expenses" element={<ExpenseManagement />} />
        <Route path="finance/expenses/compare" element={<ExpenseComparison />} />
        <Route path="products" element={<Products />} />
        <Route path="messages" element={<Messages />} />
        <Route path="manage-permission" element={<ManagePermissions />} />
        <Route path="rider-dashboard" element={<RiderDashboard />} />
        <Route path="recently-registered" element={<RecentlyRegistered />} />
        <Route path="system-activity" element={<SystemActivity />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leave" element={<Leave />} />
        <Route path="salaries-ot" element={<SalariesOT />} />
        <Route path="delivery/config" element={<DeliveryConfiguration />} />
        <Route path="sales-analytics" element={<SalesAnalytics />} />

        {/* Catch‑all redirect */}
        <Route path="*" element={<Navigate to={getLandingRouteForPermissions(permissions)} replace />} />
      </Route>
    </Routes>
  );
}

// ==================== CUSTOMER PROTECTED ROUTE ====================
function CustomerProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// ==================== CUSTOMER ROUTES ====================
function CustomerRoutes() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="about" element={<AboutUs />} />
        <Route path="contact" element={<ContactUs />} />
        <Route path="tracking" element={<OrderTracking />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        <Route path="orders" element={
          <CustomerProtectedRoute>
            <CustomerOrders />
          </CustomerProtectedRoute>
        } />
        <Route path="order/:id" element={
          <CustomerProtectedRoute>
            <CustomerOrderDetails />
          </CustomerProtectedRoute>
        } />
        <Route path="profile" element={
          <CustomerProtectedRoute>
            <Profile />
          </CustomerProtectedRoute>
        } />

        <Route element={<GuestRoute />}>
          <Route path="register" element={<Register />} />
          <Route path="login" element={<Login />} />
        </Route>

        <Route path="payment-result" element={<PaymentResult />} />
        <Route path="payment-cancel" element={<PaymentCancel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

// ==================== APP ROUTES ====================
function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/admin/2fa-setup" element={<TwoFactorSetup />} />
      <Route path="/admin/2fa-verify" element={<TwoFactorVerify />} />
      <Route path="/app/*" element={<AdminRoutes />} />
      <Route path="/*" element={<CustomerRoutes />} />
    </Routes>
  );
}

// ==================== APP ====================
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}