import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Filter, Phone, Mail, Plus, MapPin, Award, Briefcase, Calendar, 
  X, User, Calendar as CalendarIcon, Mail as MailIcon, Smartphone, 
  CreditCard, Home, Heart, Briefcase as BriefcaseIcon, Edit, Trash2, 
  UserPlus, FileText, Camera, Image, Building, Clock, DollarSign,
  Circle, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import RoleBadge from '../../components/RoleBadge';
import { formatCurrency } from '../../utils/helpers';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/employees';

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
  { key: 'Driver', label: 'Drivers', icon: Briefcase },
  { key: 'Warehouse Staff', label: 'Warehouse', icon: Briefcase },
  { key: 'Delivery Staff', label: 'Delivery', icon: Briefcase },
  { key: 'Branch Manager', label: 'Managers', icon: Award },
  { key: 'Operations Manager', label: 'Ops Managers', icon: Award },
  { key: 'Customer Support', label: 'Support', icon: Briefcase },
];

const summaryCards = [
  {
    key: 'total',
    label: 'Total Staff',
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
    key: 'onLeave',
    label: 'On Leave',
    icon: Calendar,
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
  },
  {
    key: 'managers',
    label: 'Managers',
    icon: Award,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
];

export default function Employees() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    email: '',
    gender: '',
    nic: '',
    phoneNo: '',
    role: '',
    address: '',
    marriageStatus: '',
    hiredDate: '',
    jobType: '',
    profileImage: null
  });

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      if (response.data.success) {
        setEmployees(response.data.data);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Set today's date when component loads
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, hiredDate: today }));
    fetchEmployees();
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const totalStaff = employees.length;
  const activeStaff = employees.filter((e) => e.status === 'active').length;
  const onLeaveStaff = employees.filter((e) => e.status === 'on_leave').length;
  const managers = employees.filter((e) => e.role === 'MANAGER').length;

  const summaryValues = {
    total: totalStaff,
    active: activeStaff,
    onLeave: onLeaveStaff,
    managers,
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesPosition = activeFilter === 'All' || employee.position === activeFilter;
    const matchesSearch =
      employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  // Handle Delete
  const handleDelete = async () => {
    if (employeeToDelete) {
      try {
        setSubmitting(true);
        await axios.delete(`${API_URL}/${employeeToDelete.id}`);
        setEmployees(employees.filter(emp => emp.id !== employeeToDelete.id));
        setShowDeleteConfirm(false);
        setEmployeeToDelete(null);
        setShowDetailModal(false);
        setSelectedEmployee(null);
        showSuccessNotification('Employee deleted successfully!');
      } catch (err) {
        console.error('Error deleting employee:', err);
        setError(err.response?.data?.message || 'Failed to delete employee. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Handle Add Employee
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['fullName', 'email', 'phoneNo', 'role', 'address', 'hiredDate'];
    for (let field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const employeeData = {
        name: formData.fullName,
        position: formData.role,
        phone: formData.phoneNo,
        email: formData.email,
        hireDate: formData.hiredDate,
        birthday: formData.birthday || null,
        gender: formData.gender || null,
        nic: formData.nic || null,
        address: formData.address,
        marriageStatus: formData.marriageStatus || null,
        jobType: formData.jobType || null,
        profileImage: formData.profileImage || null
      };

      const response = await axios.post(API_URL, employeeData);
      
      if (response.data.success) {
        setEmployees([...employees, response.data.data]);
        setShowCreateForm(false);
        resetForm();
        showSuccessNotification('Employee added successfully!');
      }
    } catch (err) {
      console.error('Error adding employee:', err);
      
      if (err.response) {
        if (err.response.status === 409) {
          setError('An employee with this email already exists. Please use a different email address.');
        } else if (err.response.status === 400) {
          setError(err.response.data.message || 'Please check all required fields.');
        } else {
          setError(err.response.data?.message || 'Failed to add employee. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Employee
 // Handle Edit Employee - FIXED VERSION
const handleEditEmployee = async (e) => {
  e.preventDefault();
  
  // Validate required fields
  const requiredFields = ['fullName', 'email', 'phoneNo', 'role', 'address', 'hiredDate'];
  for (let field of requiredFields) {
    if (!formData[field]) {
      alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field`);
      return;
    }
  }

  try {
    setSubmitting(true);
    setError(null);
    
    // Build update data - only include fields that have values
    const updateData = {
      name: formData.fullName,
      position: formData.role,
      phone: formData.phoneNo,
      email: formData.email,
      hireDate: formData.hiredDate,
      address: formData.address
    };
    
    // Only include optional fields if they have values
    if (formData.birthday) {
      updateData.birthday = formData.birthday;
    }
    
    if (formData.gender) {
      updateData.gender = formData.gender;
    }
    
    if (formData.nic) {
      updateData.nic = formData.nic;
    }
    
    if (formData.marriageStatus) {
      updateData.marriageStatus = formData.marriageStatus;
    }
    
    if (formData.jobType) {
      updateData.jobType = formData.jobType;
    }
    
    if (formData.profileImage) {
      updateData.profileImage = formData.profileImage;
    }

    console.log('Sending update data:', updateData); // Debug log

    const response = await axios.put(`${API_URL}/${selectedEmployee.id}`, updateData);
    
    if (response.data.success) {
      setEmployees(employees.map(emp => 
        emp.id === selectedEmployee.id ? response.data.data : emp
      ));
      setShowCreateForm(false);
      setShowDetailModal(false);
      setSelectedEmployee(response.data.data);
      resetForm();
      showSuccessNotification('Employee updated successfully!');
    }
  } catch (err) {
    console.error('Error updating employee:', err);
    console.error('Error response:', err.response?.data); // Debug log
    
    if (err.response) {
      if (err.response.status === 409) {
        setError('Email already in use by another employee.');
      } else if (err.response.status === 404) {
        setError('Employee not found.');
      } else if (err.response.status === 400) {
        setError(err.response.data?.message || 'Please check all required fields.');
      } else {
        setError(err.response.data?.message || 'Failed to update employee. Please try again.');
      }
    } else {
      setError('Network error. Please check your connection.');
    }
  } finally {
    setSubmitting(false);
  }
};

  // Reset Form
  const resetForm = () => {
    setFormData({
      fullName: '',
      birthday: '',
      email: '',
      gender: '',
      nic: '',
      phoneNo: '',
      role: '',
      address: '',
      marriageStatus: '',
      hiredDate: new Date().toISOString().split('T')[0],
      jobType: '',
      profileImage: null
    });
    setError(null);
  };

  // Open Detail Modal
  const openDetailModal = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  // Open Edit Form
  const openEditForm = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      fullName: employee.name || '',
      birthday: employee.birthday || '',
      email: employee.email || '',
      gender: employee.gender || '',
      nic: employee.nic || '',
      phoneNo: employee.phone || '',
      role: employee.position || '',
      address: employee.address || '',
      marriageStatus: employee.marriage_status || '',
      hiredDate: employee.hire_date || '',
      jobType: employee.job_type || '',
      profileImage: employee.profile_image || null
    });
    setShowCreateForm(true);
    setShowDetailModal(false);
    setError(null);
  };

  // Handle Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Show success notification
  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader size={48} className="text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`space-y-6 transition-all duration-300 ${showCreateForm || showDetailModal || showDeleteConfirm ? 'blur-sm pointer-events-none' : ''}`}
      >
        {/* Success Notification */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-4 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
            >
              <CheckCircle size={20} className="text-emerald-500" />
              <span className="text-sm font-medium">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500">Manage staff, track performance, and monitor employee activity</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              resetForm();
              setSelectedEmployee(null);
              setShowCreateForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Employee
          </motion.button>
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
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
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
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-56 bg-white"
            />
          </div>
        </motion.div>

        {/* Employee Table */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Employee</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Position</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Phone</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Hire Date</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      onClick={() => openDetailModal(employee)}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {employee.profile_image ? (
                            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-blue-400 transition-all">
                              <img 
                                src={employee.profile_image} 
                                alt={employee.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center font-semibold text-white shadow-sm">
                              {employee.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{employee.position}</td>
                      <td className="px-5 py-4 text-gray-600">{employee.phone}</td>
                      <td className="px-5 py-4 text-gray-600">{employee.email}</td>
                      <td className="px-5 py-4 text-gray-600">{employee.hire_date}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={employee.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-gray-500">
                      <Users size={36} className="mx-auto mb-3 text-gray-300" />
                      <p className="font-medium text-gray-400">No employees found</p>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      {/* Add/Edit Employee Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting) {
                  setShowCreateForm(false);
                  resetForm();
                  setSelectedEmployee(null);
                }
              }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 xl:inset-28 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto"
            >
              <div className="relative p-6 md:p-8">
                <button
                  onClick={() => {
                    if (!submitting) {
                      setShowCreateForm(false);
                      resetForm();
                      setSelectedEmployee(null);
                    }
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                  disabled={submitting}
                >
                  <X size={24} className="text-gray-400" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <UserPlus size={20} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </h2>
                </div>

                <form onSubmit={selectedEmployee ? handleEditEmployee : handleAddEmployee}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <User size={14} className="inline mr-1" /> Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Enter full name"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <CalendarIcon size={14} className="inline mr-1" /> Birthday
                      </label>
                      <input
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <MailIcon size={14} className="inline mr-1" /> Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Users size={14} className="inline mr-1" /> Gender
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        disabled={submitting}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <CreditCard size={14} className="inline mr-1" /> NIC
                      </label>
                      <input
                        type="text"
                        value={formData.nic}
                        onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                        placeholder="Enter NIC number"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Smartphone size={14} className="inline mr-1" /> Phone No *
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNo}
                        onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                        placeholder="Enter phone number"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <BriefcaseIcon size={14} className="inline mr-1" /> Role *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Role</option>
                        <option value="Driver">Driver</option>
                        <option value="Warehouse Staff">Warehouse Staff</option>
                        <option value="Delivery Staff">Delivery Staff</option>
                        <option value="Branch Manager">Branch Manager</option>
                        <option value="Operations Manager">Operations Manager</option>
                        <option value="Customer Support">Customer Support</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Home size={14} className="inline mr-1" /> Address *
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter address"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Heart size={14} className="inline mr-1" /> Marriage Status
                      </label>
                      <select
                        value={formData.marriageStatus}
                        onChange={(e) => setFormData({ ...formData, marriageStatus: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        disabled={submitting}
                      >
                        <option value="">Select Status</option>
                        <option value="Married">Married</option>
                        <option value="Unmarried">Unmarried</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Calendar size={14} className="inline mr-1" /> Hired Date *
                      </label>
                      <input
                        type="date"
                        value={formData.hiredDate}
                        onChange={(e) => setFormData({ ...formData, hiredDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <FileText size={14} className="inline mr-1" /> Job Type
                      </label>
                      <select
                        value={formData.jobType}
                        onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        disabled={submitting}
                      >
                        <option value="">Select Job Type</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Image size={14} className="inline mr-1" /> Profile Image
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="profileImage"
                          disabled={submitting}
                        />
                        <label
                          htmlFor="profileImage"
                          className={`flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Camera size={16} className="text-gray-400" />
                          Upload Image
                        </label>
                        {formData.profileImage && (
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500">
                            <img 
                              src={formData.profileImage} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (!submitting) {
                          setShowCreateForm(false);
                          resetForm();
                          setSelectedEmployee(null);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          {selectedEmployee ? 'Updating...' : 'Adding...'}
                        </>
                      ) : (
                        selectedEmployee ? 'Update Employee' : 'Add Employee'
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Employee Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedEmployee && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
              onClick={() => setShowDetailModal(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 xl:inset-28 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto"
            >
              <div className="relative p-6 md:p-8">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                >
                  <X size={24} className="text-gray-400" />
                </button>

                {/* Top Header Card */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg flex-shrink-0">
                      {selectedEmployee.profile_image ? (
                        <img 
                          src={selectedEmployee.profile_image} 
                          alt={selectedEmployee.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/20 flex items-center justify-center text-4xl font-bold text-white">
                          {selectedEmployee.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                      <p className="text-blue-100 mt-1">{selectedEmployee.position}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <RoleBadge role={selectedEmployee.role} />
                        <StatusBadge status={selectedEmployee.status} />
                      </div>
                    </div>
                    <div className="ml-auto flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(selectedEmployee);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm backdrop-blur-sm"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmployeeToDelete(selectedEmployee);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Work Information */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                        Work Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <BriefcaseIcon size={12} className="text-blue-500" /> Position
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{selectedEmployee.position}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Clock size={12} className="text-blue-500" /> Job Type
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {selectedEmployee.job_type || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Calendar size={12} className="text-blue-500" /> Hired Date
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{selectedEmployee.hire_date}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <MailIcon size={12} className="text-blue-500" /> Email
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1 break-all">{selectedEmployee.email}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Smartphone size={12} className="text-blue-500" /> Phone
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{selectedEmployee.phone}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Circle size={12} className="text-blue-500" /> Status
                          </p>
                          <div className="mt-1">
                            <StatusBadge status={selectedEmployee.status} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                        Additional Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Building size={12} className="text-blue-600" /> Branch
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">Main Branch</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Award size={12} className="text-purple-600" /> Tenure
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {(() => {
                              const hireDate = new Date(selectedEmployee.hire_date);
                              const tenureYears = ((new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
                              return `${tenureYears} years`;
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Personal Information */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                        Personal Information
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 text-sm p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl hover:shadow-sm transition-shadow">
                          <CalendarIcon size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Birthday</p>
                            <p className="font-medium text-gray-900">{selectedEmployee.birthday || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl hover:shadow-sm transition-shadow">
                          <Users size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Gender</p>
                            <p className="font-medium text-gray-900">{selectedEmployee.gender || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl hover:shadow-sm transition-shadow">
                          <CreditCard size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">NIC</p>
                            <p className="font-medium text-gray-900">{selectedEmployee.nic || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl hover:shadow-sm transition-shadow">
                          <Heart size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Marriage Status</p>
                            <p className="font-medium text-gray-900">{selectedEmployee.marriage_status || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl hover:shadow-sm transition-shadow">
                          <Home size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Address</p>
                            <p className="font-medium text-gray-900 break-words">{selectedEmployee.address || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && employeeToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting) {
                  setShowDeleteConfirm(false);
                  setEmployeeToDelete(null);
                }
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Employee</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete <span className="font-semibold text-gray-900">{employeeToDelete.name}</span>? This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        if (!submitting) {
                          setShowDeleteConfirm(false);
                          setEmployeeToDelete(null);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Employee'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}