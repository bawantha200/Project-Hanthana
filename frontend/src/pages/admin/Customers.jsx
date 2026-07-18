import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Filter, Mail, Phone, MapPin, ShoppingBag, DollarSign, ToggleLeft, ToggleRight, X, Save, User, Calendar, ShieldCheck } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency } from '../../utils/helpers';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const filterTabs = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'active', label: 'Active', icon: Users },
  { key: 'inactive', label: 'Inactive', icon: Users },
];

const summaryCards = [
  { key: 'total', label: 'Total Customers', icon: Users, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
  { key: 'active', label: 'Active', icon: Users, bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
  { key: 'inactive', label: 'Inactive', icon: Users, bgClass: 'bg-gray-100', textClass: 'text-gray-500' },
  { key: 'revenue', label: 'Total Revenue', icon: DollarSign, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
];

export default function Customers() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  // Confirmation Modal State
  const [confirmToggle, setConfirmToggle] = useState({ isOpen: false, customerId: null, currentStatus: null });
  
  // API states
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/customers/statistics');
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const url = `http://localhost:5000/api/customers?search=${searchQuery}&status=${activeFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.data);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
      fetchStats();
    }, 250);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeFilter]);

  const handleRowClick = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setIsSaving(true);
      const response = await fetch(`http://localhost:5000/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setCustomers(prev =>
          prev.map(cust => (cust.id === selectedCustomer.id ? { ...cust, ...formData } : cust))
        );
        setSelectedCustomer(null);
        alert('Customer profile updated successfully!');
      } else {
        alert('Update failed: ' + data.message);
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Server error while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };


  const handleToggleClick = (id, currentStatus, e) => {
    if (e) e.stopPropagation();
    setConfirmToggle({ isOpen: true, customerId: id, currentStatus: currentStatus });
  };


  const processToggleStatus = async () => {
    const { customerId: id, currentStatus } = confirmToggle;
    try {
      const nextActiveState = currentStatus !== 'active';
      const response = await fetch(`http://localhost:5000/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActiveState }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedStatusStr = nextActiveState ? 'active' : 'inactive';
        setCustomers(prev =>
          prev.map(cust => (cust.id === id ? { ...cust, status: updatedStatusStr } : cust))
        );
        if (selectedCustomer?.id === id) {
          setSelectedCustomer(prev => ({ ...prev, status: updatedStatusStr }));
        }
        fetchStats();
      } else {
        alert("Failed to change status: " + data.message);
      }
    } catch (err) {
      console.error('Status error:', err);
    } finally {
      setConfirmToggle({ isOpen: false, customerId: null, currentStatus: null });
    }
  };

  const summaryValues = {
    total: stats.total,
    active: stats.active,
    inactive: stats.inactive,
    revenue: formatCurrency(stats.revenue),
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 relative">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">Manage customer accounts, track spending, and monitor engagement</p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center`}>
                  <Icon size={18} className={card.textClass} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{summaryValues[card.key]}</p>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Filter & Search */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeFilter === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-56 bg-white"
          />
        </div>
      </motion.div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">Error: {error}</div>}

      {/* Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Total Orders</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Join Date</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => handleRowClick(customer)}
                  className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{customer.name}</td>
                  <td className="py-3 px-4 text-gray-500">{customer.email}</td>
                  <td className="py-3 px-4 text-gray-500">{customer.phone || 'N/A'}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{customer.totalOrders || 0}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(customer.totalSpent || 0)}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="py-3 px-4 text-gray-500">{customer.joinDate}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => handleToggleClick(customer.id, customer.status, e)}
                      className={`p-1.5 rounded-lg border transition-all duration-200 shadow-sm ${
                        customer.status === 'active' 
                          ? 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100/70' 
                          : 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100/70'
                      }`}
                      title={customer.status === 'active' ? 'Click to Deactivate' : 'Click to Activate'}
                    >
                      {customer.status === 'active' ? (
                        <ToggleRight size={22} className="text-emerald-600" />
                      ) : (
                        <ToggleLeft size={22} className="text-red-400" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* --- ALL DETAILS + EDIT FORM COMBINED MODAL --- */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />

            {/* Modal Content Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-5xl overflow-hidden relative z-10 p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-3">
                Customer Profile
              </h2>

              {/* 2-Column Main Grid Structure */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT SIDE: Non-editable Summary Stats (4 Columns) */}
                <div className="lg:col-span-4 space-y-4">
                  
                  {/* Account Badge Info */}
                  <div className="bg-gray-50/80 rounded-2xl border border-gray-100 p-5 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 mb-3">
                      {selectedCustomer.name ? selectedCustomer.name.split(' ').map((n) => n[0]).join('') : 'U'}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 max-w-full break-words">{selectedCustomer.name}</h3>
                    <div className="mt-2">
                      <StatusBadge status={selectedCustomer.status} />
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => handleToggleClick(selectedCustomer.id, selectedCustomer.status, e)}
                      className={`mt-4 w-full text-xs font-bold py-2.5 rounded-xl border transition-all duration-200 shadow-sm ${
                        selectedCustomer.status === 'active' 
                          ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100/80'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80'
                      }`}
                    >
                      {selectedCustomer.status === 'active' ? '● Account Deactivate' : '● Account Activate'}
                    </button>
                  </div>

                  {/* Operational Metrics */}
                  <div className="bg-gray-50/80 rounded-2xl border border-gray-100 p-5 space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Financial Overview</h4>
                    
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-gray-500 flex items-center gap-1.5"><ShoppingBag size={14} /> Total Orders</span>
                        <span className="font-semibold text-gray-900">{selectedCustomer.totalOrders || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(((selectedCustomer.totalOrders || 0) / 40) * 100, 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-gray-500 flex items-center gap-1.5"><DollarSign size={14} /> Total Spent</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(selectedCustomer.totalSpent || 0)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(((selectedCustomer.totalSpent || 0) / 8000) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* System Identifiers */}
                  <div className="bg-gray-50/80 rounded-2xl border border-gray-100 p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">ID:</span> <span className="font-mono text-gray-600 break-all">{selectedCustomer.id}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Join Date:</span> <span className="text-gray-700 font-medium">{selectedCustomer.joinDate}</span></div>
                  </div>

                </div>

                {/* RIGHT SIDE: Live Editable Form Fields (8 Columns) */}
                <div className="lg:col-span-8 bg-gray-50/40 border border-gray-100 rounded-2xl p-5 md:p-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-600" /> Modify Customer Information
                  </h3>
                  
                  <form onSubmit={handleSaveChanges} className="space-y-4">
                    
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Postal Address</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                        <textarea
                          name="address"
                          rows="3"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white resize-none"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                      >
                        <Save size={16} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>

                  </form>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmToggle.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmToggle({ isOpen: false, customerId: null, currentStatus: null })}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden relative z-10 p-6 text-center"
            >
              <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 ${
                confirmToggle.currentStatus === 'active' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <ShieldCheck size={24} />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Confirm Status Change
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to <strong>{confirmToggle.currentStatus === 'active' ? 'Deactivate' : 'Activate'}</strong> this customer account? This will change their system access immediately.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmToggle({ isOpen: false, customerId: null, currentStatus: null })}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors w-1/2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={processToggleStatus}
                  className={`px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm transition-colors w-1/2 ${
                    confirmToggle.currentStatus === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  Yes, Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}