import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, Mail, Phone, MapPin, ShoppingBag, DollarSign } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { customerData } from '../../data/mockData';
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
  {
    key: 'total',
    label: 'Total Customers',
    icon: Users,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
  {
    key: 'active',
    label: 'Active',
    icon: Users,
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600',
  },
  {
    key: 'inactive',
    label: 'Inactive',
    icon: Users,
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
  },
  {
    key: 'revenue',
    label: 'Total Revenue',
    icon: DollarSign,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
];

export default function Customers() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const totalCustomers = customerData.length;
  const activeCustomers = customerData.filter((c) => c.status === 'active').length;
  const inactiveCustomers = customerData.filter((c) => c.status === 'inactive').length;
  const totalRevenue = customerData.reduce((sum, c) => sum + c.totalSpent, 0);

  const summaryValues = {
    total: totalCustomers,
    active: activeCustomers,
    inactive: inactiveCustomers,
    revenue: formatCurrency(totalRevenue),
  };

  const filteredCustomers = customerData.filter((customer) => {
    const matchesStatus = activeFilter === 'All' || customer.status === activeFilter;
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.branch.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage customer accounts, track spending, and monitor engagement
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center`}>
                  <Icon size={18} className={card.textClass} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{summaryValues[card.key]}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Filter Tabs & Search */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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

      {/* Customer Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeFilter === 'All' ? 'All Customers' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Customers`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Total Revenue: <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                {/* <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th> */}
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedCustomer(selectedCustomer?.id === customer.id ? null : customer)}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                        {customer.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span className="font-medium text-gray-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{customer.email}</td>
                  <td className="py-3 px-4 text-gray-500">{customer.phone}</td>
                  {/* <td className="py-3 px-4 text-gray-500">{customer.branch}</td> */}
                  <td className="py-3 px-4 text-right text-gray-700">{customer.totalOrders}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(customer.totalSpent)}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="py-3 px-4 text-gray-500">{customer.joinDate}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
            <Users size={36} className="mb-3 text-gray-300" />
            <p className="font-medium">No customers found</p>
            <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </motion.div>

      {/* Customer Detail Cards */}
      {selectedCustomer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {/* Contact Info Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                {selectedCustomer.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{selectedCustomer.name}</h3>
                <StatusBadge status={selectedCustomer.status} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail size={16} className="text-gray-400" />
                <span>{selectedCustomer.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400" />
                <span>{selectedCustomer.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin size={16} className="text-gray-400" />
                <span>{selectedCustomer.address}</span>
              </div>
            </div>
          </motion.div>

          {/* Order Stats Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <h3 className="text-base font-semibold text-gray-900 mb-5">Order Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ShoppingBag size={16} className="text-blue-500" />
                  <span>Total Orders</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{selectedCustomer.totalOrders}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((selectedCustomer.totalOrders / 50) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign size={16} className="text-emerald-500" />
                  <span>Total Spent</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(selectedCustomer.totalSpent)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((selectedCustomer.totalSpent / 10000) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="text-cyan-500" />
                  <span>Branch</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{selectedCustomer.branch}</span>
              </div>
            </div>
          </motion.div>

          {/* Account Info Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <h3 className="text-base font-semibold text-gray-900 mb-5">Account Details</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">Customer ID</p>
                <p className="text-sm font-semibold text-blue-700 mt-1">{selectedCustomer.id.toUpperCase()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">Member Since</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{selectedCustomer.joinDate}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">Average Order Value</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatCurrency(Math.round(selectedCustomer.totalSpent / selectedCustomer.totalOrders))}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
