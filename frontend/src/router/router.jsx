// frontend/src/router/router.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ProtectedRoute from '../router/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import CustomerLayout from '../layouts/CustomerLayout';

// Admin pages
import Dashboard from '../pages/admin/Dashboard';
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
import DeliveryConfiguration from '../pages/admin/DeliveryConfiguration';
import InvoicingReports from "../pages/admin/InvoicingReports";

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
import SalesAnalytics from '../pages/admin/salesAnalytics';


/**
 * Guest-only wrapper to prevent authenticated users from opening Login & Register pages
 */
function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is already logged in, redirect them away from login/register
  if (user) {
    const role = user.role?.toUpperCase();
    if (role === 'ADMIN' || role === 'STAFF' || role === 'SALES_MANAGER') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function AdminRoutes() {
  const { user } = useAuth();

  if (user?.role === 'CUSTOMER') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route
          index
          element={
            <Navigate
              to={user?.role === 'SALES_MANAGER' ? '/admin/sales-dashboard' : '/admin/dashboard'}
              replace
            />
          }
        /> 
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sales-dashboard" element={<SalesDashboard />} />
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
        <Route path="finance/expenses" element={<ExpenseManagement />} />
        <Route path="finance/expenses/compare" element={<ExpenseComparison />} />
        <Route path="products" element={<Products />} />
        <Route path="messages" element={<Messages />} />
        <Route path="manage-permission" element={<ManagePermissions />} />
        <Route path="rider-dashboard" element={<RiderDashboard />} />
        <Route path="delivery/config" element={<DeliveryConfiguration />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="sales-analytics" element={<SalesAnalytics />} />
      </Route>
    </Routes>
  );
}

function CustomerRoutes() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="about" element={<AboutUs />} />
        <Route path="contact" element={<ContactUs />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="order/:id" element={<CustomerOrderDetails />} />
        <Route path="tracking" element={<OrderTracking />} />
        <Route path="profile" element={<Profile />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        {/* 🔒 Restricted for logged-in users */}
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/admin/2fa-setup" element={<TwoFactorSetup />} />
      <Route path="/admin/2fa-verify" element={<TwoFactorVerify />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/*" element={<CustomerRoutes />} />
    </Routes>
  );
}

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