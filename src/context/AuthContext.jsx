import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CUSTOMER: 'CUSTOMER',
};

const ROLE_PERMISSIONS = {
  ADMIN: ['dashboard', 'inventory', 'orders', 'deliveries', 'customers', 'employees', 'hrm', 'finance', 'vendors', 'reports', 'user-management', 'settings'],
  MANAGER: ['dashboard', 'inventory', 'deliveries', 'customers', 'employees', 'finance'],
  EMPLOYEE: ['hrm', 'deliveries'],
  CUSTOMER: [],
};

const DEMO_USERS = {
  admin: { id: 'u1', name: 'Admin User', email: 'admin@aquaflow.com', role: ROLES.ADMIN, branch: 'All Branches', avatar: 'AU' },
  manager: { id: 'u2', name: 'Deepak Nair', email: 'deepak@aquaflow.com', role: ROLES.MANAGER, branch: 'Mumbai Central', avatar: 'DN' },
  employee: { id: 'u4', name: 'Suresh Menon', email: 'suresh@aquaflow.com', role: ROLES.EMPLOYEE, branch: 'Mumbai Central', avatar: 'SM' },
  customer: { id: 'c1', name: 'Rahul Verma', email: 'rahul@email.com', role: ROLES.CUSTOMER, branch: 'Mumbai Central', avatar: 'RV' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO_USERS.admin);

  const switchRole = useCallback((roleKey) => {
    setUser(DEMO_USERS[roleKey] || DEMO_USERS.admin);
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
  }, [user]);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isManager = user?.role === ROLES.MANAGER;
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const isCustomer = user?.role === ROLES.CUSTOMER;

  return (
    <AuthContext.Provider value={{ user, switchRole, hasPermission, isAdmin, isManager, isEmployee, isCustomer, ROLES }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export { ROLES, ROLE_PERMISSIONS };
