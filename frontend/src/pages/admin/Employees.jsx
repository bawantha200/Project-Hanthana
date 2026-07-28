import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Filter, Phone, Mail, Plus, MapPin, Award, Briefcase, Calendar, 
  X, User, Calendar as CalendarIcon, Mail as MailIcon, Smartphone, 
  CreditCard, Home, Heart, Briefcase as BriefcaseIcon, Edit, Trash2, 
  UserPlus, FileText, Camera, Image, Building, Clock, DollarSign,
  Circle, CheckCircle, AlertCircle, Loader, Shield, BarChart, Package, 
  Calculator, Truck, Bike, Headphones, Crown, ChevronDown, Wallet, Coins,
  Settings, List, PlusCircle, Pencil, Trash, Save, Users as UsersIcon
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/employees';
const DESIGNATION_API_URL = 'http://localhost:5000/api/designations';
const ROLES_API_URL = 'http://localhost:5000/api/roles';

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

// Summary Cards
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Validation states
  const [validationErrors, setValidationErrors] = useState({
    fullName: '',
    email: '',
    phoneNo: '',
    nic: '',
    gender: '',
    designation: '',
    address: '',
    hiredDate: '',
    birthday: '',
    marriageStatus: '',
    jobType: '',
    baseSalary: '',
    bonus: '',
    status: '',
    role: ''
  });

  // Designation CRUD States
  const [designations, setDesignations] = useState([]);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [isEditingDesignation, setIsEditingDesignation] = useState(false);
  const [editingDesignationId, setEditingDesignationId] = useState(null);
  const [designationForm, setDesignationForm] = useState({ name: '', otRate: 500 });
  const [showDesignationDeleteConfirm, setShowDesignationDeleteConfirm] = useState(false);
  const [designationToDelete, setDesignationToDelete] = useState(null);
  const [designationLoading, setDesignationLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    birthday: '',
    email: '',
    gender: '',
    nic: '',
    phoneNo: '',
    designation: '',
    designationId: '',
    address: '',
    marriageStatus: '',
    hiredDate: '',
    jobType: '',
    profileImage: null,
    baseSalary: '',
    bonus: '',
    status: 'active',
    role: ''
  });

  // ========== HELPER FUNCTIONS ==========
  
  // Get role display name from employee object
  const getRoleDisplay = (employee) => {
    if (!employee) return 'No Role';
    
    // If role is an object with role_name property (from join)
    if (employee.role && typeof employee.role === 'object') {
      return employee.role.role_name || 'No Role';
    }
    // If role is a string
    if (employee.role && typeof employee.role === 'string') {
      return employee.role;
    }
    // If role_id exists but role object doesn't
    if (employee.role_id) {
      const foundRole = roles.find(r => r.id === employee.role_id);
      return foundRole ? foundRole.role_name : 'No Role';
    }
    return 'No Role';
  };

  // Get role color based on role name
  const getRoleColor = (employee) => {
    let roleName = '';
    
    if (!employee) return 'bg-gray-50 text-gray-400';
    
    if (employee.role && typeof employee.role === 'object') {
      roleName = employee.role.role_name || '';
    } else if (employee.role && typeof employee.role === 'string') {
      roleName = employee.role;
    } else if (employee.role_id) {
      const foundRole = roles.find(r => r.id === employee.role_id);
      roleName = foundRole ? foundRole.role_name : '';
    }
    
    if (!roleName) return 'bg-gray-50 text-gray-400';
    
    const lowerRole = roleName.toLowerCase();
    if (lowerRole === 'admin') return 'bg-purple-50 text-purple-700';
    if (lowerRole === 'manager') return 'bg-indigo-50 text-indigo-700';
    if (lowerRole === 'hr') return 'bg-pink-50 text-pink-700';
    if (lowerRole === 'employee') return 'bg-gray-50 text-gray-700';
    return 'bg-gray-50 text-gray-700';
  };

  // Get designation name from employee
  const getDesignationName = (employee) => {
    if (!employee) return '';
    if (employee.designation && typeof employee.designation === 'object') {
      return employee.designation.designation || '';
    }
    return employee.designation || '';
  };

  const getDesignationId = (employee) => {
    if (!employee) return null;
    if (employee.designation && typeof employee.designation === 'object') {
      return employee.designation.id;
    }
    return employee.designation_id || null;
  };


  

  // Helper function to get role name by ID
  const getRoleName = (roleId) => {
    if (!roleId) return 'No Role';
    const role = roles.find(r => r.id === roleId);
    return role ? role.role_name : 'No Role';
  };

  // Validation functions

  const capitalizeWords = (str) => {
  return str.replace(/(^|\s)\S/g, (match) => match.toUpperCase());
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^0[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  const validateNIC = (nic) => {
    const oldNICRegex = /^[0-9]{9}[VvXx]$/;
    const newNICRegex = /^[0-9]{12}$/;
    return oldNICRegex.test(nic) || newNICRegex.test(nic);
  };

  const validateFullName = (name) => {
    return name.trim().length >= 2;
  };

  const validateGender = (gender) => {
    return gender && gender !== '';
  };

  const validateDesignation = (designation) => {
    return designation && designation !== '';
  };

  const validateAddress = (address) => {
    return address.trim().length >= 5;
  };

  const validateHiredDate = (date) => {
    return date && date !== '';
  };

  const validateBirthday = (date) => {
    if (!date) return true;
    const today = new Date();
    const birthDate = new Date(date);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 16;
    }
    return age >= 16;
  };

  const validateMarriageStatus = (status) => {
    return status && status !== '';
  };

  const validateJobType = (type) => {
    return type && type !== '';
  };

  const validateSalary = (salary) => {
    if (!salary) return true;
    const num = parseFloat(salary);
    return !isNaN(num) && num >= 0;
  };

  const validateBonus = (bonus) => {
    if (!bonus) return true;
    const num = parseFloat(bonus);
    return !isNaN(num) && num >= 0;
  };

  const validateStatus = (status) => {
    return status && status !== '';
  };

  const validateField = (fieldName, value) => {
    let error = '';
    
    switch (fieldName) {
      case 'fullName':
        if (!value || value.trim().length < 2) {
          error = 'Full name must be at least 2 characters long';
        }
        break;
      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!validateEmail(value)) {
          error = 'Please enter a valid email address (e.g., name@domain.com)';
        }
        break;
      case 'phoneNo':
        if (!value) {
          error = 'Phone number is required';
        } else if (!validatePhone(value)) {
          error = 'Please enter a valid Sri Lankan phone number (e.g., 0712345678)';
        }
        break;
      case 'nic':
        if (value && !validateNIC(value)) {
          error = 'Please enter a valid NIC (9 digits + V/X or 12 digits)';
        }
        break;
      case 'gender':
        if (!value) {
          error = 'Gender is required';
        }
        break;
      case 'designation':
        if (!value) {
          error = 'Designation is required';
        }
        break;
      case 'address':
        if (!value || value.trim().length < 5) {
          error = 'Address must be at least 5 characters long';
        }
        break;
      case 'hiredDate':
        if (!value) {
          error = 'Hired date is required';
        }
        break;
      case 'birthday':
        if (value && !validateBirthday(value)) {
          error = 'Employee must be at least 16 years old';
        }
        break;
      case 'marriageStatus':
        if (!value) {
          error = 'Marriage status is required';
        }
        break;
      case 'jobType':
        if (!value) {
          error = 'Job type is required';
        }
        break;
      case 'baseSalary':
        if (value && !validateSalary(value)) {
          error = 'Please enter a valid salary amount';
        }
        break;
      case 'bonus':
        if (value && !validateBonus(value)) {
          error = 'Please enter a valid bonus amount';
        }
        break;
      case 'status':
        if (!value) {
          error = 'Status is required';
        }
        break;
      default:
        break;
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    return error === '';
  };

  const validateForm = () => {
    const fields = [
      'fullName', 'email', 'phoneNo', 'gender', 'designation', 
      'address', 'hiredDate', 'marriageStatus', 'jobType', 'status'
    ];
    
    let isValid = true;
    
    fields.forEach(field => {
      const value = formData[field];
      const isFieldValid = validateField(field, value);
      if (!isFieldValid) {
        isValid = false;
      }
    });

    if (formData.nic && !validateField('nic', formData.nic)) {
      isValid = false;
    }
    
    if (formData.birthday && !validateField('birthday', formData.birthday)) {
      isValid = false;
    }
    
    if (formData.baseSalary && !validateField('baseSalary', formData.baseSalary)) {
      isValid = false;
    }
    
    if (formData.bonus && !validateField('bonus', formData.bonus)) {
      isValid = false;
    }

    return isValid;
  };

  // ========== FETCH ROLES ==========
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(ROLES_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Roles from API:', response.data);
      if (response.data.success && response.data.data) {
        setRoles(response.data.data);
      } else {
        // Fallback to default roles if API fails
        setRoles([
          { id: 1, role_name: 'EMPLOYEE', description: 'Standard employee' },
          { id: 2, role_name: 'MANAGER', description: 'Manager role' },
          { id: 3, role_name: 'ADMIN', description: 'Administrator' },
          { id: 4, role_name: 'HR', description: 'Human Resources' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      // Set default roles as fallback
      setRoles([
        { id: 1, role_name: 'EMPLOYEE', description: 'Standard employee' },
        { id: 2, role_name: 'MANAGER', description: 'Manager role' },
        { id: 3, role_name: 'ADMIN', description: 'Administrator' },
        { id: 4, role_name: 'HR', description: 'Human Resources' }
      ]);
    } finally {
      setRolesLoading(false);
    }
  };

  // ========== FETCH DESIGNATIONS ==========
  const fetchDesignations = async () => {
    try {
      setDesignationLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(DESIGNATION_API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Designations from API:', response.data);
      if (response.data.success && response.data.data.length > 0) {
        setDesignations(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching designations:', err);
      setDesignations([]);
    } finally {
      setDesignationLoading(false);
    }
  };

  // ========== CRUD OPERATIONS FOR DESIGNATIONS ==========

 // ========== CRUD OPERATIONS FOR DESIGNATIONS (FIXED) ==========

const handleAddDesignation = async (e) => {
  e.preventDefault();
  if (!designationForm.name.trim()) {
    setError('Please enter a designation name');
    return;
  }

  if (!designationForm.otRate || parseFloat(designationForm.otRate) <= 0) {
    setError('Please enter a valid OT rate');
    return;
  }

  const exists = designations.some(d =>
    d.designation.toLowerCase() === designationForm.name.trim().toLowerCase()
  );

  if (exists) {
    setError(`"${designationForm.name.trim()}" already exists!`);
    return;
  }

  try {
    setSubmitting(true);
    setError(null);
    const token = localStorage.getItem('token');
    const response = await axios.post(DESIGNATION_API_URL,
      {
        designation: designationForm.name.trim(),
        ot_rate: parseFloat(designationForm.otRate)
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      setDesignations([...designations, response.data.data]);
      setDesignationForm({ name: '', otRate: 500 });
      showSuccessNotification('Designation added successfully!');
      // NOTE: modal is left open so user can add another one / manage list
    }
  } catch (err) {
    console.error('Error adding designation:', err);
    // FIX: show the real backend error instead of silently faking success
    if (err.response) {
      if (err.response.status === 409) {
        setError(err.response.data?.message || 'This designation already exists.');
      } else {
        setError(err.response.data?.message || 'Failed to add designation.');
      }
    } else {
      setError('Network error. Please check if the server is running.');
    }
  } finally {
    setSubmitting(false);
  }
};

const handleEditDesignation = async (e) => {
  e.preventDefault();
  if (!designationForm.name.trim()) {
    setError('Please enter a designation name');
    return;
  }

  if (!designationForm.otRate || parseFloat(designationForm.otRate) <= 0) {
    setError('Please enter a valid OT rate');
    return;
  }

  const exists = designations.some(d =>
    d.id !== editingDesignationId &&
    d.designation.toLowerCase() === designationForm.name.trim().toLowerCase()
  );

  if (exists) {
    setError(`"${designationForm.name.trim()}" already exists!`);
    return;
  }

  try {
    setSubmitting(true);
    setError(null);
    const token = localStorage.getItem('token');
    const response = await axios.put(`${DESIGNATION_API_URL}/${editingDesignationId}`,
      {
        designation: designationForm.name.trim(),
        ot_rate: parseFloat(designationForm.otRate)
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      setDesignations(designations.map(d =>
        d.id === editingDesignationId ? response.data.data : d
      ));
      setDesignationForm({ name: '', otRate: 500 });
      setIsEditingDesignation(false);
      setEditingDesignationId(null);
      showSuccessNotification('Designation updated successfully!');
      // FIX: refresh employees so the table shows the new designation name/rate immediately
      fetchEmployees();
    }
  } catch (err) {
    console.error('Error updating designation:', err);
    if (err.response) {
      if (err.response.status === 409) {
        setError(err.response.data?.message || 'This designation name already exists.');
      } else if (err.response.status === 404) {
        setError('Designation not found. It may have been deleted already.');
      } else {
        setError(err.response.data?.message || 'Failed to update designation.');
      }
    } else {
      setError('Network error. Please check if the server is running.');
    }
  } finally {
    setSubmitting(false);
  }
};

const handleDeleteDesignation = async () => {
  if (!designationToDelete) return;

  try {
    setSubmitting(true);
    setError(null);
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${DESIGNATION_API_URL}/${designationToDelete.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success) {
      setDesignations(designations.filter(d => d.id !== designationToDelete.id));
      setShowDesignationDeleteConfirm(false);
      setDesignationToDelete(null);
      showSuccessNotification('Designation deleted successfully!');
    }
  } catch (err) {
    console.error('Error deleting designation:', err);
    setShowDesignationDeleteConfirm(false);
    // FIX: don't fake-delete locally when the backend actually blocked it
    // (e.g. 409 = employees are still assigned to this designation)
    if (err.response) {
      setError(err.response.data?.message || 'Failed to delete designation.');
    } else {
      setError('Network error. Please check if the server is running.');
    }
    setDesignationToDelete(null);
  } finally {
    setSubmitting(false);
  }
};
  const openAddDesignationModal = () => {
  setDesignationForm({ name: '', otRate: 500 });
  setIsEditingDesignation(false);
  setEditingDesignationId(null);
  setShowDesignationModal(true);
  setError(null);
};

  const openEditDesignationModal = (designation) => {
  setDesignationForm({ 
    name: designation.designation,
    otRate: designation.ot_rate || 500
  });
  setIsEditingDesignation(true);
  setEditingDesignationId(designation.id);
  setShowDesignationModal(true);
  setError(null);
};

  const openDeleteDesignationConfirm = (designation) => {
    setDesignationToDelete(designation);
    setShowDesignationDeleteConfirm(true);
    setError(null);
  };

  // ========== FETCH EMPLOYEES ==========
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Employees from API:', response.data);
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

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, hiredDate: today }));
    fetchEmployees();
    fetchDesignations();
    fetchRoles();
  }, []);

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
  
  // FIXED: managers count with proper null checking
  const managers = employees.filter((e) => {
    const desName = getDesignationName(e);
    // Check if employee has manager role or designation contains manager
    const roleName = e.role && typeof e.role === 'object' ? e.role.role_name : e.role || '';
    return desName.toLowerCase().includes('manager') || 
           roleName.toLowerCase().includes('manager') ||
           e.role_id === 2;
  }).length;

  const summaryValues = {
    total: totalStaff,
    active: activeStaff,
    onLeave: onLeaveStaff,
    managers: managers,
  };

  // Build filter tabs from designations
  const filterTabs = [
    { key: 'All', label: 'All', icon: Filter },
    ...designations.map(d => ({ key: d.designation, label: d.designation, icon: Briefcase }))
  ];

  const filteredEmployees = employees.filter((employee) => {
    const employeeDesignation = getDesignationName(employee);
    const matchesPosition = activeFilter === 'All' || employeeDesignation === activeFilter;
    const matchesSearch =
      employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employeeDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  const handleDelete = async () => {
    if (employeeToDelete) {
      try {
        setSubmitting(true);
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/${employeeToDelete.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix all validation errors before submitting');
      const firstErrorField = Object.keys(validationErrors).find(key => validationErrors[key]);
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const employeeData = {
        name: formData.fullName,
        position: formData.designation,
        designation_id: formData.designationId ? parseInt(formData.designationId) : null,
        phone: formData.phoneNo,
        email: formData.email,
        hireDate: formData.hiredDate,
        birthday: formData.birthday || null,
        gender: formData.gender || null,
        nic: formData.nic || null,
        address: formData.address,
        marriageStatus: formData.marriageStatus || null,
        jobType: formData.jobType || null,
        profileImage: formData.profileImage || null,
        baseSalary: parseFloat(formData.baseSalary) || 0,
        bonus: parseFloat(formData.bonus) || 0,
        status: formData.status || 'active',
        role_id: formData.role || null
      };

      console.log('Sending employee data:', JSON.stringify(employeeData, null, 2));

      const token = localStorage.getItem('token');
      const response = await axios.post(API_URL, employeeData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });
      
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

  const handleEditEmployee = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    setError('Please fix all validation errors before submitting');
    const firstErrorField = Object.keys(validationErrors).find(key => validationErrors[key]);
    if (firstErrorField) {
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
    return;
  }

    try {
      setSubmitting(true);
      setError(null);
      
      const updateData = {
        name: formData.fullName,
        designation_id: formData.designationId ? parseInt(formData.designationId) : null,
        phone: formData.phoneNo,
        email: formData.email,
        hireDate: formData.hiredDate,
        address: formData.address,
        baseSalary: parseFloat(formData.baseSalary) || 0,
        bonus: parseFloat(formData.bonus) || 0,
        status: formData.status || 'active',
        role_id: formData.role || null
      };
      
      if (formData.birthday) updateData.birthday = formData.birthday;
      if (formData.gender) updateData.gender = formData.gender;
      if (formData.nic) updateData.nic = formData.nic;
      if (formData.marriageStatus) updateData.marriageStatus = formData.marriageStatus;
      if (formData.jobType) updateData.jobType = formData.jobType;
      if (formData.profileImage) updateData.profileImage = formData.profileImage;

      console.log('Updating employee data:', updateData);

    // ✅ NEW: If employee was rejected and admin now assigns a role,
    // automatically move them back to 'pending' so they reappear
    // in the pending list for account creation.
    let statusToSend = formData.status;
    if (selectedEmployee?.status === 'rejected' && formData.role) {
      statusToSend = 'pending';
    }
    
    const updateData = {
      name: formData.fullName,
      designation_id: formData.designationId ? parseInt(formData.designationId) : null,
      phone: formData.phoneNo,
      email: formData.email,
      hireDate: formData.hiredDate,
      address: formData.address,
      baseSalary: parseFloat(formData.baseSalary) || 0,
      bonus: parseFloat(formData.bonus) || 0,
      status: statusToSend,          // ✅ use the resolved status
      role_id: formData.role || null
    };
    
    if (formData.birthday) updateData.birthday = formData.birthday;
    if (formData.gender) updateData.gender = formData.gender;
    if (formData.nic) updateData.nic = formData.nic;
    if (formData.marriageStatus) updateData.marriageStatus = formData.marriageStatus;
    if (formData.jobType) updateData.jobType = formData.jobType;
    if (formData.profileImage) updateData.profileImage = formData.profileImage;

    console.log('Updating employee data:', updateData);

    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/${selectedEmployee.id}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      setEmployees(employees.map(emp => 
        emp.id === selectedEmployee.id ? response.data.data : emp
      ));
      setShowCreateForm(false);
      setShowDetailModal(false);
      setSelectedEmployee(response.data.data);
      resetForm();
      showSuccessNotification(
        statusToSend === 'pending' && selectedEmployee?.status === 'rejected'
          ? 'Employee re-activated — pending account creation!'
          : 'Employee updated successfully!'
      );
    }
  } catch (err) {
    console.error('Error updating employee:', err);
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

  const resetForm = () => {
    setFormData({
      fullName: '',
      birthday: '',
      email: '',
      gender: '',
      nic: '',
      phoneNo: '',
      designation: '',
      designationId: '',
      address: '',
      marriageStatus: '',
      hiredDate: new Date().toISOString().split('T')[0],
      jobType: '',
      profileImage: null,
      baseSalary: '',
      bonus: '',
      status: 'active',
      role: ''
    });
    setValidationErrors({
      fullName: '',
      email: '',
      phoneNo: '',
      nic: '',
      gender: '',
      designation: '',
      address: '',
      hiredDate: '',
      birthday: '',
      marriageStatus: '',
      jobType: '',
      baseSalary: '',
      bonus: '',
      status: '',
      role: ''
    });
    setError(null);
  };

  const openDetailModal = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  const openEditForm = (employee) => {
    setSelectedEmployee(employee);
    const desId = getDesignationId(employee);
    const desName = getDesignationName(employee);
    
    setFormData({
      fullName: employee.name || '',
      birthday: employee.birthday || '',
      email: employee.email || '',
      gender: employee.gender || '',
      nic: employee.nic || '',
      phoneNo: employee.phone || '',
      designation: desName || '',
      designationId: desId ? desId.toString() : '',
      address: employee.address || '',
      marriageStatus: employee.marriage_status || '',
      hiredDate: employee.hire_date || '',
      jobType: employee.job_type || '',
      profileImage: employee.profile_image || null,
      baseSalary: employee.base_salary || employee.baseSalary || '',
      bonus: employee.bonus || '',
      status: employee.status || 'active',
      role: employee.role_id || ''
    });
    setValidationErrors({
      fullName: '',
      email: '',
      phoneNo: '',
      nic: '',
      gender: '',
      designation: '',
      address: '',
      hiredDate: '',
      birthday: '',
      marriageStatus: '',
      jobType: '',
      baseSalary: '',
      bonus: '',
      status: '',
      role: ''
    });
    setShowCreateForm(true);
    setShowDetailModal(false);
    setError(null);
  };

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

  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  const currentTab = filterTabs.find(tab => tab.key === activeFilter) || filterTabs[0];
  const CurrentIcon = currentTab.icon;

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
        className={`space-y-6 transition-all duration-300 ${showCreateForm || showDetailModal || showDeleteConfirm || showDesignationModal || showDesignationDeleteConfirm ? 'blur-sm pointer-events-none' : ''}`}
      >
        {showSuccess && (
          <div className="fixed top-20 right-4 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle size={20} className="text-emerald-500" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <X size={16} />
            </button>
          </div>
        )}

        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500">Manage staff, track performance, and monitor employee activity</p>
          </div>
          <div className="flex items-center gap-3">
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
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={openAddDesignationModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Settings size={18} />
              Manage Designations
            </motion.button>
          </div>
        </motion.div>

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

        {/* Filter Dropdown & Search */}
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Briefcase size={16} className="text-gray-400" />
              <span>Designation:</span>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all duration-200 min-w-[200px]"
              >
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <CurrentIcon size={16} className="text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700 flex-1 text-left">
                  {currentTab.label}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-300 ${
                    isDropdownOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white rounded-2xl border border-gray-200 shadow-xl z-50 py-2 overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {filterTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeFilter === tab.key;
                        return (
                          <button
                            key={tab.key}
                            className={`
                              w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150
                              ${isActive 
                                ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                            onClick={() => {
                              setActiveFilter(tab.key);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                            <span className="flex-1 text-left">{tab.label}</span>
                            {isActive && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-blue-600 font-medium">Active</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-56 bg-white"
            />
          </div>
        </motion.div>

        {/* Employee Table */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Employee</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Designation</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Role</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Phone</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Hire Date</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Base Salary</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600">Bonus</th>
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
                              <img src={employee.profile_image} alt={employee.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center font-semibold text-white shadow-sm">
                              {employee.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {getDesignationName(employee) || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(employee)}`}>
                          {getRoleDisplay(employee)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{employee.phone}</td>
                      <td className="px-5 py-4 text-gray-600">{employee.email}</td>
                      <td className="px-5 py-4 text-gray-600">{employee.hire_date}</td>
                      <td className="px-5 py-4 text-gray-600 font-medium text-emerald-600">
                        {employee.base_salary ? `Rs. ${employee.base_salary.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-gray-600 font-medium text-blue-600">
                        {employee.bonus ? `Rs. ${employee.bonus.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={employee.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-gray-500">
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

      {/* ============================================ */}
      {/* DESIGNATION CRUD MODAL - Add/Edit Designation */}


{/* ============================================ */}
{/* DESIGNATION CRUD MODAL - Add/Edit Designation with OT Rate */}
{/* ============================================ */}
<AnimatePresence>
  {showDesignationModal && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
        onClick={() => {
          if (!submitting) {
            setShowDesignationModal(false);
            setDesignationForm({ name: '', otRate: 500 });
            setIsEditingDesignation(false);
            setEditingDesignationId(null);
            setError(null);
          }
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-4 md:inset-20 lg:inset-28 xl:inset-32 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto"
      >
        <div className="relative p-6 md:p-8">
          <button
            onClick={() => {
              if (!submitting) {
                setShowDesignationModal(false);
                setDesignationForm({ name: '', otRate: 500 });
                setIsEditingDesignation(false);
                setEditingDesignationId(null);
                setError(null);
              }
            }}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
            disabled={submitting}
          >
            <X size={24} className="text-gray-400" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <List size={20} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditingDesignation ? 'Edit Designation' : 'Add New Designation'}
            </h2>
          </div>

          <form onSubmit={isEditingDesignation ? handleEditDesignation : handleAddDesignation}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  <Briefcase size={14} className="inline mr-1" /> Designation Name *
                </label>
                <input
                  type="text"
                  value={designationForm.name}
                  onChange={(e) => setDesignationForm({ ...designationForm, name: e.target.value })}
                  placeholder="Enter designation name"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                  required
                  disabled={submitting}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {isEditingDesignation ? 'Update the designation name' : 'Add a new designation for employees'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  <Clock size={14} className="inline mr-1" /> OT Rate (LKR/hour) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={designationForm.otRate}
                  onChange={(e) => setDesignationForm({ ...designationForm, otRate: e.target.value })}
                  placeholder="Enter OT rate per hour"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                  required
                  disabled={submitting}
                />
                <p className="text-xs text-gray-400 mt-1">
                  This rate will be used for OT calculations for employees with this designation
                </p>
              </div>

              {/* Display existing designations with OT rates */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  <List size={14} className="inline mr-1" /> Existing Designations ({designations.length})
                </label>
                <div className="max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  {designations.length > 0 ? (
                    designations.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700">{d.designation}</span>
                          <span className="ml-3 text-xs text-blue-600 font-medium">
                            OT: {d.ot_rate ? `Rs. ${parseFloat(d.ot_rate).toFixed(2)}/hr` : 'Rs. 500.00/hr'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditDesignationModal(d)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Designation"
                            disabled={submitting}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDesignationConfirm(d)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Designation"
                            disabled={submitting}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">No designations added yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  if (!submitting) {
                    setShowDesignationModal(false);
                    setDesignationForm({ name: '', otRate: 500 });
                    setIsEditingDesignation(false);
                    setEditingDesignationId(null);
                    setError(null);
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
                    {isEditingDesignation ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {isEditingDesignation ? 'Update Designation' : 'Add Designation'}
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
      {/* ============================================ */}
      {/* DESIGNATION DELETE CONFIRMATION MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showDesignationDeleteConfirm && designationToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting) {
                  setShowDesignationDeleteConfirm(false);
                  setDesignationToDelete(null);
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
                    <Trash size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Designation</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to delete designation{' '}
                    <span className="font-semibold text-gray-900">"{designationToDelete.designation}"</span>?
                  </p>
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
                    ⚠️ This designation will be removed from the system.
                    {employees.filter(e => getDesignationName(e) === designationToDelete.designation).length > 0 && (
                      <span className="block mt-1 text-red-600">
                        Warning: {employees.filter(e => getDesignationName(e) === designationToDelete.designation).length} employee(s) have this designation!
                      </span>
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        if (!submitting) {
                          setShowDesignationDeleteConfirm(false);
                          setDesignationToDelete(null);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteDesignation}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Designation'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* EMPLOYEE ADD/EDIT MODAL */}
      {/* ============================================ */}
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
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <User size={14} className="inline mr-1" /> Full Name *
                      </label>
                      <input
  type="text"
  name="fullName"
  value={formData.fullName}
  onChange={(e) => {
    const capitalized = capitalizeWords(e.target.value);
    setFormData({ ...formData, fullName: capitalized });
    validateField('fullName', capitalized);
  }}
  onBlur={(e) => validateField('fullName', e.target.value)}
  placeholder="Enter full name"
  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
    validationErrors.fullName 
      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
      : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
  }`}
  required
  disabled={submitting}
/>
                      {validationErrors.fullName && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Birthday */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <CalendarIcon size={14} className="inline mr-1" /> Birthday
                      </label>
                      <input
                        type="date"
                        name="birthday"
                        value={formData.birthday}
                        onChange={(e) => {
                          setFormData({ ...formData, birthday: e.target.value });
                          if (e.target.value) validateField('birthday', e.target.value);
                        }}
                        onBlur={(e) => {
                          if (e.target.value) validateField('birthday', e.target.value);
                        }}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          validationErrors.birthday 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        disabled={submitting}
                      />
                      {validationErrors.birthday && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.birthday}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <MailIcon size={14} className="inline mr-1" /> Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          validateField('email', e.target.value);
                        }}
                        onBlur={(e) => validateField('email', e.target.value)}
                        placeholder="Enter email"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          validationErrors.email 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      />
                      {validationErrors.email && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Users size={14} className="inline mr-1" /> Gender *
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={(e) => {
                          setFormData({ ...formData, gender: e.target.value });
                          validateField('gender', e.target.value);
                        }}
                        onBlur={(e) => validateField('gender', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
                          validationErrors.gender 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {validationErrors.gender && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.gender}
                        </p>
                      )}
                    </div>

                    {/* NIC */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <CreditCard size={14} className="inline mr-1" /> NIC
                      </label>
                      <input
                        type="text"
                        name="nic"
                        value={formData.nic}
                        onChange={(e) => {
                          setFormData({ ...formData, nic: e.target.value });
                          if (e.target.value) validateField('nic', e.target.value);
                        }}
                        onBlur={(e) => {
                          if (e.target.value) validateField('nic', e.target.value);
                        }}
                        placeholder="Enter NIC number"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          validationErrors.nic 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        disabled={submitting}
                      />
                      {validationErrors.nic && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.nic}
                        </p>
                      )}
                    </div>

                    {/* Phone No */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Smartphone size={14} className="inline mr-1" /> Phone No *
                      </label>
                      <input
                        type="tel"
                        name="phoneNo"
                        value={formData.phoneNo}
                        onChange={(e) => {
                          setFormData({ ...formData, phoneNo: e.target.value });
                          validateField('phoneNo', e.target.value);
                        }}
                        onBlur={(e) => validateField('phoneNo', e.target.value)}
                        placeholder="Enter phone number (e.g., 0712345678)"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          validationErrors.phoneNo 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      />
                      {validationErrors.phoneNo && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.phoneNo}
                        </p>
                      )}
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <BriefcaseIcon size={14} className="inline mr-1" /> Designation *
                      </label>
                      <select
                        name="designation"
                        value={formData.designationId || ''}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedDesignation = designations.find(d => d.id.toString() === selectedId);
                          setFormData({ 
                            ...formData, 
                            designationId: selectedId,
                            designation: selectedDesignation ? selectedDesignation.designation : '' 
                          });
                          validateField('designation', selectedDesignation ? selectedDesignation.designation : '');
                        }}
                        onBlur={(e) => {
                          const selectedDesignation = designations.find(d => d.id.toString() === e.target.value);
                          validateField('designation', selectedDesignation ? selectedDesignation.designation : '');
                        }}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
                          validationErrors.designation 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Designation</option>
                        {designations.map((d) => (
                          <option key={d.id} value={d.id.toString()}>
                            {d.designation}
                          </option>
                        ))}
                      </select>
                      {validationErrors.designation && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.designation}
                        </p>
                      )}
                      {designations.length === 0 && (
                        <p className="text-xs text-amber-500 mt-1">⚠️ No designations available. Please add designations first.</p>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Home size={14} className="inline mr-1" /> Address *
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={(e) => {
                          setFormData({ ...formData, address: e.target.value });
                          validateField('address', e.target.value);
                        }}
                        onBlur={(e) => validateField('address', e.target.value)}
                        placeholder="Enter address"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          validationErrors.address 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      />
                      {validationErrors.address && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.address}
                        </p>
                      )}
                    </div>

                    {/* Marriage Status */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Heart size={14} className="inline mr-1" /> Marriage Status *
                      </label>
                      <select
                        name="marriageStatus"
                        value={formData.marriageStatus}
                        onChange={(e) => {
                          setFormData({ ...formData, marriageStatus: e.target.value });
                          validateField('marriageStatus', e.target.value);
                        }}
                        onBlur={(e) => validateField('marriageStatus', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
                          validationErrors.marriageStatus 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Status</option>
                        <option value="Married">Married</option>
                        <option value="Unmarried">Unmarried</option>
                      </select>
                      {validationErrors.marriageStatus && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.marriageStatus}
                        </p>
                      )}
                    </div>

                    {/* Hired Date */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Calendar size={14} className="inline mr-1" /> Hired Date *
                      </label>
                      <input
                        type="date"
                        name="hiredDate"
                        value={formData.hiredDate}
                        onChange={(e) => {
                          setFormData({ ...formData, hiredDate: e.target.value });
                          validateField('hiredDate', e.target.value);
                        }}
                        onBlur={(e) => validateField('hiredDate', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          validationErrors.hiredDate 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      />
                      {validationErrors.hiredDate && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.hiredDate}
                        </p>
                      )}
                    </div>

                    {/* Job Type */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <FileText size={14} className="inline mr-1" /> Job Type *
                      </label>
                      <select
                        name="jobType"
                        value={formData.jobType}
                        onChange={(e) => {
                          setFormData({ ...formData, jobType: e.target.value });
                          validateField('jobType', e.target.value);
                        }}
                        onBlur={(e) => validateField('jobType', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
                          validationErrors.jobType 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Job Type</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contract">Contract</option>
                      </select>
                      {validationErrors.jobType && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.jobType}
                        </p>
                      )}
                    </div>

                    {/* Role Type - Fetched from Database */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Shield size={14} className="inline mr-1" /> Role Type
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={(e) => {
                          setFormData({ ...formData, role: e.target.value });
                          validateField('role', e.target.value);
                        }}
                        onBlur={(e) => validateField('role', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
                          validationErrors.role 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        disabled={submitting || rolesLoading}
                      >
                        <option value="">No Role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.role_name}
                          </option>
                        ))}
                      </select>
                      {validationErrors.role && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.role}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {rolesLoading ? 'Loading roles...' : 'Select a role for the employee (optional)'}
                      </p>
                    </div>

                    {/* Base Salary */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Wallet size={14} className="inline mr-1" /> Base Salary (LKR)
                      </label>
                      <input
                        type="number"
                        name="baseSalary"
                        value={formData.baseSalary}
                        onChange={(e) => {
                          setFormData({ ...formData, baseSalary: e.target.value });
                          if (e.target.value) validateField('baseSalary', e.target.value);
                        }}
                        onBlur={(e) => {
                          if (e.target.value) validateField('baseSalary', e.target.value);
                        }}
                        placeholder="Enter base salary"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          validationErrors.baseSalary 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-400'
                        }`}
                        disabled={submitting}
                      />
                      {validationErrors.baseSalary && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.baseSalary}
                        </p>
                      )}
                    </div>

                    {/* Bonus */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Coins size={14} className="inline mr-1" /> Bonus (LKR)
                      </label>
                      <input
                        type="number"
                        name="bonus"
                        value={formData.bonus}
                        onChange={(e) => {
                          setFormData({ ...formData, bonus: e.target.value });
                          if (e.target.value) validateField('bonus', e.target.value);
                        }}
                        onBlur={(e) => {
                          if (e.target.value) validateField('bonus', e.target.value);
                        }}
                        placeholder="Enter bonus amount"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          validationErrors.bonus 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        disabled={submitting}
                      />
                      {validationErrors.bonus && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.bonus}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Circle size={14} className="inline mr-1" /> Status *
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={(e) => {
                          setFormData({ ...formData, status: e.target.value });
                          validateField('status', e.target.value);
                        }}
                        onBlur={(e) => validateField('status', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
                          validationErrors.status 
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' 
                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-400'
                        }`}
                        required
                        disabled={submitting}
                      >
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {validationErrors.status && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationErrors.status}
                        </p>
                      )}
                    </div>

                    {/* Profile Image */}
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

                  {Object.values(validationErrors).some(error => error) && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700 flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-500" />
                        Please fix all validation errors before submitting
                      </p>
                    </div>
                  )}

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
                      <p className="text-blue-100 mt-1">{getDesignationName(selectedEmployee)}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={selectedEmployee.status} />
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white">
                          {getRoleDisplay(selectedEmployee)}
                        </span>
                      </div>
                    </div>
                    
                    {selectedEmployee.status === 'rejected' && (
                      <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 md:col-span-2">
                        <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                          <AlertCircle size={12} className="text-rose-500" /> Reason for Rejection
                        </p>
                        <p className="text-sm font-medium text-rose-700 mt-1">
                          {selectedEmployee.rejection_reason || 'No reason provided'}
                        </p>
                      </div>
                    )}
                    
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                        Work Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <BriefcaseIcon size={12} className="text-blue-500" /> Designation
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{getDesignationName(selectedEmployee)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Shield size={12} className="text-blue-500" /> Role
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {getRoleDisplay(selectedEmployee)}
                          </p>
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

                    {/* Salary Information Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                        Salary Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Wallet size={12} className="text-emerald-600" /> Base Salary
                          </p>
                          <p className="text-lg font-bold text-emerald-700 mt-1">
                            {selectedEmployee.base_salary ? `Rs. ${selectedEmployee.base_salary.toLocaleString()}` : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <Coins size={12} className="text-blue-600" /> Bonus
                          </p>
                          <p className="text-lg font-bold text-blue-700 mt-1">
                            {selectedEmployee.bonus ? `Rs. ${selectedEmployee.bonus.toLocaleString()}` : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                            <DollarSign size={12} className="text-purple-600" /> Total Compensation
                          </p>
                          <p className="text-lg font-bold text-purple-700 mt-1">
                            {selectedEmployee.base_salary || selectedEmployee.bonus ? 
                              `Rs. ${((selectedEmployee.base_salary || 0) + (selectedEmployee.bonus || 0)).toLocaleString()}` 
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

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

      {/* Employee Delete Confirmation Modal */}
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
