import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, Search, Plus,UserPlus, Phone, Mail, Package } from 'lucide-react';
import VendorTable from '../../components/VendorTable';
import StatusBadge from '../../components/StatusBadge';
import { vendorData } from '../../data/mockData';

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

export default function Vendors() {
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const totalVendors = vendorData.length;
  const activeVendors = vendorData.filter((v) => v.status === 'active').length;
  const inactiveVendors = vendorData.filter((v) => v.status === 'inactive').length;

  const filteredVendors = vendorData.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.contact.toLowerCase().includes(search.toLowerCase()) ||
      v.supplyType.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage suppliers, delivery partners, and vendor relationships
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Truck size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Vendors</p>
              <p className="text-xl font-bold text-gray-900">{totalVendors}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Truck size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Active</p>
              <p className="text-xl font-bold text-gray-900">{activeVendors}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <Truck size={18} className="text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Inactive</p>
              <p className="text-xl font-bold text-gray-900">{inactiveVendors}</p>
            </div>
          </div>
        </div>
      </motion.div>

{/* Create User Modal Placeholder */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6 ring-2 ring-blue-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <UserPlus size={18} className="text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Create New Vendor</h2>
            </div>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Full Name</label>
              <input
                type="text"
                placeholder="Enter vendor full name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="Enter Contact Person"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="Enter Email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="Enter Phone Number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Supply Type</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                <option value="">Select supply type</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Services">Services</option>
              </select>

            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
          </div>
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Create Vendor
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Vendor Table Section */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">All Vendors</h2>
            <p className="text-xs text-gray-400 mt-0.5">Supplier directory and delivery partners</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-52"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={14} />
              Add Vendor
            </motion.button>
          </div>
        </div>
        <VendorTable vendors={filteredVendors} />
      </motion.div>

      

      {/* Vendor Detail Cards */}
      <motion.div variants={itemVariants}>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Vendor Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredVendors.map((vendor) => (
            <motion.div
              key={vendor.id}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
                    {vendor.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{vendor.name}</h3>
                    <p className="text-xs text-gray-500">{vendor.contact}</p>
                  </div>
                </div>
                <StatusBadge status={vendor.status} />
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  <span className="truncate">{vendor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Package size={14} className="text-gray-400" />
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {vendor.supplyType}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">Last Delivery</span>
                <span className="text-xs font-medium text-gray-600">{vendor.lastDelivery}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
