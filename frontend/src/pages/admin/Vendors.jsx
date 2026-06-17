import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Truck, Search, Plus, UserPlus, Phone, Package, X } from 'lucide-react';
import VendorTable from '../../components/VendorTable';
import StatusBadge from '../../components/StatusBadge';

const API_BASE_URL = 'http://localhost:5000/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const fetchVendors = async () => {
  const res = await fetch(`${API_BASE_URL}/vendors`);
  if (!res.ok) throw new Error('Failed to fetch vendors');
  return res.json();
};

const createVendor = async (vendor) => {
  const res = await fetch(`${API_BASE_URL}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendor),
  });
  if (!res.ok) throw new Error('Failed to create vendor');
  return res.json();
};

const updateVendor = async (id, vendor) => {
  const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendor),
  });
  if (!res.ok) throw new Error('Failed to update vendor');
  return res.json();
};

const deleteVendor = async (id) => {
  const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete vendor');
};

export default function Vendors() {
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_number: '',
    supply_type: '',
    isActive: true,
  });

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchVendors();
      const vendorArray = Array.isArray(data) ? data : [];
      const mapped = vendorArray.map(v => ({
        id: v.id,
        name: v.vendor_name || '',
        phone: v.contact_number || '',
        supplyType: v.supply_type || '',
        status: v.isActive ? 'active' : 'inactive',
        lastDelivery: v.last_delivery ? new Date(v.last_delivery).toLocaleDateString() : 'N/A',
      }));
      setVendors(mapped);
    } catch (err) {
      console.error(err);
      alert('Failed to load vendors');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadVendors);
  }, [loadVendors]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'isActive' ? value === 'true' : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      contact_number: '',
      supply_type: '',
      isActive: true,
    });
    setEditingVendor(null);
    setShowCreateForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, {
          vendor_name: formData.vendor_name,
          contact_number: formData.contact_number,
          supply_type: formData.supply_type,
          isActive: formData.isActive,
        });
      } else {
        await createVendor({
          vendor_name: formData.vendor_name,
          contact_number: formData.contact_number,
          supply_type: formData.supply_type,
          isActive: formData.isActive,
        });
      }
      resetForm();
      loadVendors();
    } catch (err) {
      console.error(err);
      alert('Operation failed');
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_name: vendor.name,
      contact_number: vendor.phone,
      supply_type: vendor.supplyType,
      isActive: vendor.status === 'active',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await deleteVendor(id);
      loadVendors();
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.phone.toLowerCase().includes(search.toLowerCase()) ||
    v.supplyType.toLowerCase().includes(search.toLowerCase())
  );

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter(v => v.status === 'active').length;
  const inactiveVendors = vendors.filter(v => v.status === 'inactive').length;

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading vendors...</div>;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage suppliers, delivery partners, and vendor relationships
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
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

      {/* Create / Edit Form Modal */}
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
              <h2 className="text-base font-semibold text-gray-900">
                {editingVendor ? 'Edit Vendor' : 'Create New Vendor'}
              </h2>
            </div>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Full Name *</label>
                <input
                  type="text"
                  name="vendor_name"
                  value={formData.vendor_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supply Type *</label>
                <select
                  name="supply_type"
                  value={formData.supply_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
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
                  name="isActive"
                  value={String(formData.isActive)}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
              >
                {editingVendor ? 'Update Vendor' : 'Create Vendor'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Vendor Table Section */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
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
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-52"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setEditingVendor(null);
                setFormData({ vendor_name: '', contact_number: '', supply_type: '', isActive: true });
                setShowCreateForm(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
            >
              <Plus size={14} />
              Add Vendor
            </motion.button>
          </div>
        </div>
        <VendorTable vendors={filteredVendors} onEdit={handleEdit} onDelete={handleDelete} />
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
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {vendor.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{vendor.name}</h3>
                    <p className="text-xs text-gray-500">{vendor.contact || '—'}</p>
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

              <div className="mt-4 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleEdit(vendor)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
                >
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDelete(vendor.id)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
