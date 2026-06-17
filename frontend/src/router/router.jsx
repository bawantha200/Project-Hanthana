import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import HRM from '../pages/admin/HRM';
import Vendors from '../pages/admin/Vendors';
import Customers from '../pages/admin/Customers';
import Finance from '../pages/admin/Finance';
import Products from '../pages/admin/Products';


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

function AdminRoutes() {
  const { user } = useAuth();

  if (user?.role === 'CUSTOMER') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      {/* Use adminlayout as a parent route element*/}
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        
        <Route path="dashboard" element={<Dashboard />
        } />
        
        <Route path="inventory" element={<Inventory />
        } />
        
        <Route path="orders" element={<Orders />
        } />

        <Route path="deliveries" element={<Deliveries />
        } />

        <Route path="reports" element={<Reports />
        } />
        
        <Route path="user-management" element={<UserManagement />
        } />

        <Route path="settings" element={<Settings />} />    
 
        <Route path="employees" element={<Employees />
        } />
        
        <Route path="hrm" element={<HRM />
        } />
        

        <Route path="vendors" element={ 
            <Vendors />
        } />

        <Route path="customers" element={
            <Customers />
        } />

        <Route path="finance" element={
            <Finance />
        } />

        <Route path="settings" element={<Products />} />    


        


        {/* Invalid admin paths redirect to dashboard */}
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
        <Route path="tracking" element={<OrderTracking />} />
        <Route path="profile" element={<Profile />} />
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}