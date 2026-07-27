// src/config/navItems.js
//
// Single source of truth for admin nav items. `id` must match a
// `permission_name` row in the `permissions` table exactly.
// Order matters: Login.jsx uses this same order to pick the first
// page a user has permission for, so keep the most "default" pages
// (dashboard, etc.) near the top.

import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, UserCog, Briefcase,
  DollarSign, Store, BarChart3, Shield, Settings, Clipboard, Warehouse,
  Sliders, FileCheck, Factory, Bike, Inbox, FileText,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { id: 'sales-dashboard', label: 'Sales Dashboard', icon: BarChart3, path: '/admin/sales-dashboard' },
  { id: 'sales-analytics', label: 'Sales Analytics', icon: BarChart3, path: '/admin/sales-analytics' },
  { id: 'inventory-dashboard', label: 'Inventory Dashboard', icon: LayoutDashboard, path: '/admin/demandforecast-dashboard' },
  { id: 'jit-dashboard', label: 'JIT Dashboard', icon: Factory, path: '/admin/jit-dashboard' },
  { id: 'products', label: 'Products', icon: Package, path: '/admin/products' },
  { id: 'inventory', label: 'Inventory', icon: Warehouse, path: '/admin/inventory' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/admin/orders' },
  { id: 'pos', label: 'POS', icon: Clipboard, path: '/admin/pos' },
  { id: 'deliveries', label: 'Deliveries', icon: Truck, path: '/admin/deliveries' },
  { id: 'deliveryconfig', label: 'Delivery Configuration', icon: Truck, path: '/admin/delivery/config' },
  { id: 'messages', label: 'Messages', icon: Inbox, path: '/admin/messages' },
  { id: 'rider-dashboard', label: 'Rider Dashboard', icon: Bike, path: '/admin/rider-dashboard' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/admin/customers' },
  { id: 'hrm-dashboard', label: 'HRM Dashboard', icon: Briefcase, path: '/admin/hrm-dashboard' },
  { id: 'employees', label: 'Employees', icon: UserCog, path: '/admin/employees' },
  { id: 'hrm', label: 'HRM', icon: Briefcase, path: '/admin/hrm' },
  { id: 'finance', label: 'Finance', icon: DollarSign, path: '/admin/finance' },
  { id: 'invoice', label: 'Invoice', icon: FileText, path: '/admin/finance/invoicing-reports' },
  { id: 'expenses', label: 'Expenses', icon: FileText, path: '/admin/finance/expenses' },
  { id: 'vendors', label: 'Vendors', icon: Store, path: '/admin/vendors' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  { id: 'user-management', label: 'User Management', icon: Shield, path: '/admin/user-management' },
  { id: 'settings-request', label: 'Settings Requests', icon: FileCheck, path: '/admin/settings-requests' },
  { id: 'manage-permission', label: 'Manage Permission', icon: Sliders, path: '/admin/manage-permission' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
];