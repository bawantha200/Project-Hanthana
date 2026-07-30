// pages/Vendors.jsx
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, Search, Plus, UserPlus, Phone, Mail, Package, 
  Edit, Trash2, Loader2, AlertTriangle, X, ChevronLeft, 
  ChevronRight, Building2, Calendar, MapPin, Info, Filter, RotateCcw
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import VendorTable from '../../components/VendorTable';
import StatusBadge from '../../components/StatusBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const vendorCompanyOptions = [
  'BottleTech Packaging Ltd.',
  'PurePack Industries',
  'EcoBottle Solutions',
  'AquaSeal Packaging Co.',
  'Prime Polymer Supplies',
  'ClearCap Industries',
];

// Supply type options — shared between the create/edit form and the table filter
const supplyTypeOptions = [
  'Raw Materials',
  'Packaging Materials',
  'Production Supplies',
  'Maintenance Supplies',
  'Safety Supplies',
  'Office Supplies',
  'Distribution Supplies',
];

// Sri Lankan phone validation — client-side format check only, NOT a
// security control. The real validation/sanitization must also happen
// on your backend, since anyone can bypass frontend checks by calling
// the API directly.
// Accepts:
//   Local:         0771234567        (0 + 9 digits = 10 digits total)
//   International: +94771234567      (+94 + 9 digits)
// Returns an error message string, or null if the phone number is valid.
const validatePhone = (phone) => {
  const trimmed = (phone || '').trim();

  if (!trimmed) {
    return 'Phone number is required.';
  }

  if (!/^\+?[0-9]+$/.test(trimmed)) {
    return 'Phone number must contain only numbers.';
  }

  const isInternational = trimmed.startsWith('+');

  if (isInternational) {
    if (!trimmed.startsWith('+94')) {
      return 'Phone number must start with a valid Sri Lankan mobile or area code.';
    }
    const digitsAfterCode = trimmed.slice(3);
    if (digitsAfterCode.length !== 9) {
      return 'Phone number must be 10 digits.';
    }
    if (!/^\+94[0-9]{9}$/.test(trimmed)) {
      return 'Please enter a valid Sri Lankan phone number.';
    }
  } else {
    if (trimmed.length !== 10) {
      return 'Phone number must be 10 digits.';
    }
    if (!trimmed.startsWith('0')) {
      return 'Phone number must start with a valid Sri Lankan mobile or area code.';
    }
    if (!/^0[0-9]{9}$/.test(trimmed)) {
      return 'Please enter a valid Sri Lankan phone number.';
    }
  }

  return null; // valid
};

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

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <div className="text-xs text-gray-500 order-2 sm:order-1">
        Showing <span className="font-medium text-gray-700">{totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
        <span className="font-medium text-gray-700">
          {Math.min(currentPage * itemsPerPage, totalItems)}
        </span>{' '}
        of <span className="font-medium text-gray-700">{totalItems}</span> vendors
      </div>
      
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-blue-600 text-white'
                : page === '...'
                ? 'text-gray-400 cursor-default'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// Vendor Details Popup Modal
const VendorDetailsPopup = ({ vendor, isOpen, onClose, onEdit, onDelete }) => {
  if (!isOpen || !vendor) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0">
              {vendor.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
              <p className="text-xs text-gray-500">{vendor.contact || 'No contact person'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-3 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
            <Phone size={16} className="text-gray-400 flex-shrink-0" />
            <span className="font-medium">{vendor.phone || 'No phone number'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
            <Mail size={16} className="text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{vendor.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
            <Package size={16} className="text-gray-400 flex-shrink-0" />
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
              {vendor.supplyType || 'Not specified'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
            <Info size={16} className="text-gray-400 flex-shrink-0" />
            <span>Status: <StatusBadge status={vendor.status} /></span>
          </div>
          {vendor.lastDelivery && (
            <div className="flex items-center gap-3 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <span>Registered Date: {new Date(vendor.lastDelivery).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => {
              onClose();
              onEdit(vendor);
            }}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Edit size={16} />
            Edit Vendor
          </button>
          <button
            onClick={() => {
              onClose();
              onDelete(vendor);
            }}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [supplyTypeFilter, setSupplyTypeFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [paginatedVendors, setPaginatedVendors] = useState([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  
  // Vendor details popup
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorDetails, setShowVendorDetails] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    supplyType: '',
    status: 'active',
  });
  const [companySelection, setCompanySelection] = useState('');
  const [phoneError, setPhoneError] = useState('');

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
      // Reset to first page when new data loads
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load vendors');
    } finally {
      if (showTableLoader) setTableLoading(false);
      setLoading(false);
    }
  };

  // Distinct vendor companies actually present in the data, so the
  // filter dropdown only ever shows companies that have vendors.
  const vendorCompanyFilterOptions = useMemo(() => {
    const names = new Set(vendors.map((v) => v.name).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [vendors]);

  // Distinct supply types actually present in the data, combined with
  // the standard list, so all standard types show up even before any
  // vendor uses them, and any legacy/custom values still show too.
  const supplyTypeFilterOptions = useMemo(() => {
    const present = new Set(vendors.map((v) => v.supplyType).filter(Boolean));
    const combined = new Set([...supplyTypeOptions, ...present]);
    return Array.from(combined);
  }, [vendors]);

  // Apply status / company / supply type filters on top of the fetched vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (companyFilter !== 'all' && v.name !== companyFilter) return false;
      if (supplyTypeFilter !== 'all' && v.supplyType !== supplyTypeFilter) return false;
      return true;
    });
  }, [vendors, statusFilter, companyFilter, supplyTypeFilter]);

  const totalItems = filteredVendors.length;
  const hasActiveFilters = statusFilter !== 'all' || companyFilter !== 'all' || supplyTypeFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setCompanyFilter('all');
    setSupplyTypeFilter('all');
  };

  // Reset to first page whenever a filter changes, so we don't land on
  // an empty out-of-range page
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, companyFilter, supplyTypeFilter]);

  // Update paginated vendors when the filtered list or page changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedVendors(filteredVendors.slice(startIndex, endIndex));
  }, [filteredVendors, currentPage, itemsPerPage]);

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

  // Handle phone number input — only digits and a single leading "+" allowed
  const handlePhoneChange = (e) => {
    let value = e.target.value;

    // Strip anything that isn't a digit or "+"
    value = value.replace(/[^\d+]/g, '');

    // Only allow "+" as the very first character
    if (value.indexOf('+') > 0) {
      value = value.replace(/\+/g, '');
    }
    // Only allow one "+"
    value = value.replace(/(?!^)\+/g, '');

    setFormData((prev) => ({ ...prev, phone: value }));
    if (phoneError) setPhoneError('');
  };

  // Handle vendor company dropdown selection
  const handleCompanySelectChange = (e) => {
    const value = e.target.value;
    setCompanySelection(value);
    if (value === '__other__') {
      setFormData((prev) => ({ ...prev, name: '' }));
    } else {
      setFormData((prev) => ({ ...prev, name: value }));
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingVendor(null);
    setFormData({ name: '', contact: '', phone: '', email: '', supplyType: '', status: 'active' });
    setCompanySelection('');
    setPhoneError('');
    setShowModal(true);
    setShowDeleteModal(false);
    setShowVendorDetails(false);
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
    setCompanySelection(
      vendorCompanyOptions.includes(vendor.name) ? vendor.name : '__other__'
    );
    setPhoneError('');
    setShowModal(true);
    setShowDeleteModal(false);
    setShowVendorDetails(false);
  };

  // Open delete modal
  const openDeleteModal = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
    setShowModal(false);
    setShowVendorDetails(false);
  };

  // Handle row click - show vendor details
  const handleRowClick = (vendor) => {
    setSelectedVendor(vendor);
    setShowVendorDetails(true);
  };

  // Submit create/update
  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneValidationError = validatePhone(formData.phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      toast.error(phoneValidationError);
      return;
    }

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

  // Compute stats (based on all fetched vendors, not the filtered view)
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.status === 'active').length;
  const inactiveVendors = vendors.filter((v) => v.status === 'inactive').length;

  if (loading) return <div className="p-6 text-center">Loading vendors...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      {/* Vendor Details Popup */}
      <VendorDetailsPopup
        vendor={selectedVendor}
        isOpen={showVendorDetails}
        onClose={() => {
          setShowVendorDetails(false);
          setSelectedVendor(null);
        }}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      />

      {/* ===== CREATE/EDIT MODAL ===== */}
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Company</label>
                  <select
                    value={companySelection}
                    onChange={handleCompanySelectChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                    required
                  >
                    <option value="">Select vendor company</option>
                    {vendorCompanyOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    <option value="__other__">Other (specify)</option>
                  </select>
                  {companySelection === '__other__' && (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter vendor company name"
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      required
                    />
                  )}
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
                    onChange={handlePhoneChange}
                    placeholder="e.g., 0771234567 or +94771234567"
                    inputMode="tel"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      phoneError
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
                        : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                    }`}
                    required
                  />
                  {phoneError && (
                    <p className="text-xs text-red-600 mt-1">{phoneError}</p>
                  )}
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
                    {supplyTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  {editingVendor ? (
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                      Active
                    </div>
                  )}
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

      {/* ===== MAIN CONTENT ===== */}
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
              <p className="text-xs text-gray-400 mt-0.5">Click on a row to view vendor details</p>
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

          {/* Filter Bar */}
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Filter size={13} />
              Filters
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all max-w-[180px]"
            >
              <option value="all">All Vendor Companies</option>
              {vendorCompanyFilterOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={supplyTypeFilter}
              onChange={(e) => setSupplyTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            >
              <option value="all">All Supply Types</option>
              {supplyTypeFilterOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw size={12} />
                Clear filters
              </button>
            )}
          </div>
          
          <div className="relative">
            {tableLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            <VendorTable
              vendors={paginatedVendors}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              onRowClick={handleRowClick}
            />
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        </motion.div>
      </motion.div>
    </>
  );
}