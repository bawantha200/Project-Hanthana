// pages/Vendors.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Search, Plus, UserPlus, Phone, Mail, Package, Edit, Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import VendorTable from '../../components/VendorTable';
import StatusBadge from '../../components/StatusBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    supplyType: '',
    status: 'active',
  });

  // Fetch vendors
  const fetchVendors = async (searchTerm = '', showTableLoader = false) => {
    if (showTableLoader) setTableLoading(true);
    try {
      const url = new URL(`${API_BASE}/vendors`);
      if (searchTerm) url.searchParams.append('search', searchTerm);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch vendors');
      const data = await res.json();
      setVendors(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load vendors');
    } finally {
      if (showTableLoader) setTableLoading(false);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchVendors('', false);
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors(search, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingVendor(null);
    setFormData({ name: '', contact: '', phone: '', email: '', supplyType: '', status: 'active' });
    setShowModal(true);
    setShowDeleteModal(false); // ensure delete modal is closed
  };

  // Open edit modal
  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact: vendor.contact,
      phone: vendor.phone,
      email: vendor.email,
      supplyType: vendor.supplyType,
      status: vendor.status,
    });
    setShowModal(true);
    setShowDeleteModal(false); // ensure delete modal is closed
  };

  // Open delete modal
  const openDeleteModal = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
    setShowModal(false); // close edit/create modal if open
  };

  // Submit create/update
  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingVendor;
    const url = isEditing
      ? `${API_BASE}/vendors/${editingVendor.id}`
      : `${API_BASE}/vendors`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save vendor');
      }
      setShowModal(false);
      toast.success(isEditing ? 'Vendor updated successfully!' : 'Vendor created successfully!');
      fetchVendors(search, true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!vendorToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/vendors/${vendorToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete vendor');
      }
      toast.success('Vendor deleted successfully!');
      setShowDeleteModal(false);
      setVendorToDelete(null);
      fetchVendors(search, true);
    } catch (err) {
      toast.error(err.message);
      setShowDeleteModal(false);
    }
  };

  // Compute stats
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.status === 'active').length;
  const inactiveVendors = vendors.filter((v) => v.status === 'inactive').length;

  if (loading) return <div className="p-6 text-center">Loading vendors...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {/* ===== CREATE/EDIT MODAL (FIXED OVERLAY) ===== */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <UserPlus size={18} className="text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {editingVendor ? 'Edit Vendor' : 'Create New Vendor'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter vendor full name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="Enter Contact Person"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter Email"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter Phone Number"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Supply Type</label>
                  <select
                    name="supplyType"
                    value={formData.supplyType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                  >
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
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {showDeleteModal && vendorToDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Delete Vendor</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete <strong>{vendorToDelete.name}</strong>? This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ===== MAIN CONTENT (unchanged) ===== */}
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

        {/* Vendor Table */}
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
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={14} />
                Add Vendor
              </motion.button>
            </div>
          </div>
          <div className="relative">
            {tableLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            <VendorTable
              vendors={vendors}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
            />
          </div>
        </motion.div>

        {/* Vendor Cards */}
        <motion.div variants={itemVariants}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Vendor Details</h2>
          <div className="relative">
            {tableLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {vendors.map((vendor) => (
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
                    <span className="text-xs font-medium text-gray-600">
                      {vendor.lastDelivery ? new Date(vendor.lastDelivery).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(vendor)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(vendor)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}