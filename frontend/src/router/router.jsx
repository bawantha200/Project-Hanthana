// frontend/src/router/router.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ProtectedRoute from '../router/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import CustomerLayout from '../layouts/CustomerLayout';

// Admin pages
import Dashboard from '../pages/admin/Dashboard';
import Inventory from '../pages/admin/Inventory';
import Orders from '../pages/admin/Orders';
import Deliveries from '../pages/admin/Deliveries';
import Reports from '../pages/admin/Reports';
import UserManagement from '../pages/admin/UserManagement';
import Settings from '../pages/admin/Settings';
import Employees from '../pages/admin/Employees';
import Hrmdashboard from '../pages/admin/Hrmdashboard';
import HRM from '../pages/admin/HRM';
import Vendors from '../pages/admin/Vendors';
import Customers from '../pages/admin/Customers';
import Finance from '../pages/admin/Finance';
import Products from '../pages/admin/Products';
import Messages from '../pages/admin/Messages';
import ManagePermissions from '../pages/admin/ManagePermissions';
import AdminOrderDetails from '../pages/admin/OrderDetails';
import RiderDashboard from '../pages/admin/RiderDashboard';

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
import CustomerOrderDetails from '../pages/customer/OrderDetails'; // ✅ Customer order details

function AdminRoutes() {
  const { user } = useAuth();

  if (user?.role === 'CUSTOMER') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="Hrmdashboard" element={<Hrmdashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<AdminOrderDetails />} /> {/* ✅ Admin order details */}
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="reports" element={<Reports />} />
        <Route path="user-management" element={<UserManagement />} />
        <Route path="settings" element={<Settings />} />
        <Route path="employees" element={<Employees />} />
        <Route path="hrm" element={<HRM />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="customers" element={<Customers />} />
        <Route path="finance" element={<Finance />} />
        <Route path="products" element={<Products />} />
        <Route path="messages" element={<Messages />} />
        <Route path="manage-permission" element={<ManagePermissions />} />
        <Route path="rider-dashboard" element={<RiderDashboard />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
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
        <Route path="order/:id" element={<CustomerOrderDetails />} /> {/* ✅ Customer order details */}
        <Route path="tracking" element={<OrderTracking />} />
        <Route path="profile" element={<Profile />} />
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
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