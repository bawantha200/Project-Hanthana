// backend/src/controllers/employeeController.js
const supabase = require('../config/db');
const cache = require('../config/cache');

// Cache configuration
const CACHE_TTL = {
  EMPLOYEES_LIST: 60,        // 60 seconds for employee list
  EMPLOYEE_DETAILS: 120,     // 2 minutes for single employee
  PENDING_EMPLOYEES: 30,     // 30 seconds for pending list
  EMPLOYEE_STATS: 60,        // 60 seconds for stats
  ROLES_LIST: 300,           // 5 minutes for roles
};

const CACHE_KEYS = {
  EMPLOYEES: 'employees',
  PENDING_EMPLOYEES: 'pending_employees',
  EMPLOYEE_STATS: 'employee_stats',
  ROLES: 'roles',
  EMPLOYEE_PREFIX: 'employee_',
};

// Helper to invalidate employee caches
const invalidateEmployeeCaches = (employeeId = null) => {
  cache.del(CACHE_KEYS.EMPLOYEES);
  cache.del(CACHE_KEYS.PENDING_EMPLOYEES);
  cache.del(CACHE_KEYS.EMPLOYEE_STATS);
  if (employeeId) {
    cache.del(`${CACHE_KEYS.EMPLOYEE_PREFIX}${employeeId}`);
  }
};

// ===== GET all employees =====
exports.getAllEmployees = async (req, res) => {
  try {
    const { position, status, search, limit, page } = req.query;

    console.log('[Employees] Fetching with params:', { position, status, search, limit, page });

    // Build cache key based on query params
    const cacheKey = `${CACHE_KEYS.EMPLOYEES}_${status || 'all'}_${search || 'none'}_${page || 1}_${limit || 50}`;
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('[Employees] Returning cached data');
      return res.status(200).json({
        success: true,
        ...cachedData,
        fromCache: true
      });
    }

    let query = supabase
  .from('employees')
  .select(`
    id,
    name,
    email,
    phone,
    status,
    hire_date,
    birthday,
    gender,
    nic,
    address,
    marriage_status,
    job_type,
    profile_image,
    base_salary,
    role_id,  
    bonus,
    rejection_reason,
    designation:designation_id (
      id,
      designation,
      ot_rate
    ),
    role:role_id (
      id,
      role_name,
      description
    )
  `);

    // Status filter
    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    // Search filter
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query.order('id', { ascending: false }).range(from, to);

    const { data, error } = await query;

    if (error) {
      console.error('[Employees] Supabase error detail:', error);
      return res.status(400).json({
        success: false,
        message: 'Error fetching employees',
        error: error.message
      });
    }

    const responseData = {
      data: data || [],
      count: data?.length || 0,
      page: pageNum
    };

    // Store in cache
    cache.set(cacheKey, responseData, CACHE_TTL.EMPLOYEES_LIST);

    console.log(`[Employees] Found ${data?.length || 0} employees`);

    res.status(200).json({
      success: true,
      ...responseData
    });
  } catch (error) {
    console.error('[Employees] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== GET pending employees =====
exports.getPendingEmployees = async (req, res) => {
  try {
    console.log('[Employees] Fetching pending employees...');
    
    // Check cache
    const cachedData = cache.get(CACHE_KEYS.PENDING_EMPLOYEES);
    if (cachedData) {
      console.log('[Employees] Returning cached pending employees');
      return res.status(200).json({
        success: true,
        data: cachedData,
        fromCache: true
      });
    }
    
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        role:role_id (
          id,
          role_name,
          description
        ),
        designation:designation_id (
          id,
          designation,
          ot_rate
        )
      `)
      .eq('status', 'pending')
      .order('id', { ascending: false });

    if (error) {
      console.error('[Employees] Pending error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error fetching pending employees',
        error: error.message
      });
    }

    // Store in cache
    cache.set(CACHE_KEYS.PENDING_EMPLOYEES, data || [], CACHE_TTL.PENDING_EMPLOYEES);

    console.log(`[Employees] Found ${data?.length || 0} pending employees`);

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[Employees] Pending server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== GET a single employee by ID =====
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check cache
    const cacheKey = `${CACHE_KEYS.EMPLOYEE_PREFIX}${id}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`[Employees] Returning cached employee: ${id}`);
      return res.status(200).json({
        success: true,
        data: cachedData,
        fromCache: true
      });
    }
    
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        designation:designation_id (
          id,
          designation,
          ot_rate
        ),
        role:role_id (
          id,
          role_name,
          description
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        error: error.message
      });
    }
    
    // Store in cache
    cache.set(cacheKey, data, CACHE_TTL.EMPLOYEE_DETAILS);
    
    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('[Employees] Get by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== CREATE a new employee =====
exports.createEmployee = async (req, res) => {
  try {
    const {
      name,
      designation_id,
      phone,
      email,
      hireDate,
      birthday,
      gender,
      nic,
      address,
      marriageStatus,
      jobType,
      profileImage,
      baseSalary,
      bonus,
      role_id
    } = req.body;

    // Validation
    if (!name || !email || !phone || !designation_id || !address || !hireDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, phone, designation, address, hireDate'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Phone validation
    const cleanedPhone = phone.trim().replace(/\s+/g, '');
    const localPhoneRegex = /^0\d{9}$/;
    const intlPhoneRegex = /^\+94\d{9}$/;
    
    if (!localPhoneRegex.test(cleanedPhone) && !intlPhoneRegex.test(cleanedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits (e.g. 0771234567) or valid +94 format'
      });
    }

    // NIC validation (if provided)
    if (nic) {
      const cleanedNic = nic.trim().toUpperCase();
      const oldNicRegex = /^[0-9]{9}[VX]$/;
      const newNicRegex = /^[0-9]{12}$/;
      
      if (!oldNicRegex.test(cleanedNic) && !newNicRegex.test(cleanedNic)) {
        return res.status(400).json({
          success: false,
          message: 'NIC must be 9 digits + V/X (old format) or 12 digits (new format)'
        });
      }
    }

    // Duplicate checks
    const { data: existingEmail } = await supabase
      .from('employees').select('email').eq('email', email).maybeSingle();
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Employee with this email already exists' });
    }

    const { data: existingPhone } = await supabase
      .from('employees').select('phone').eq('phone', cleanedPhone).maybeSingle();
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'Employee with this phone number already exists' });
    }

    if (nic) {
      const { data: existingNic } = await supabase
        .from('employees').select('nic').eq('nic', nic.trim().toUpperCase()).maybeSingle();
      if (existingNic) {
        return res.status(409).json({ success: false, message: 'Employee with this NIC already exists' });
      }
    }

    const employeeData = {
      name,
      designation_id: designation_id || null,
      phone: cleanedPhone,
      email,
      hire_date: hireDate,
      status: role_id ? 'pending' : 'active',
      role_id: role_id || null,
      gender: gender || null,
      nic: nic ? nic.trim().toUpperCase() : null,
      address,
      marriage_status: marriageStatus || null,
      job_type: jobType || null,
      profile_image: profileImage || null,
      base_salary: baseSalary ? parseFloat(baseSalary) : 0,
      bonus: bonus ? parseFloat(bonus) : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('employees')
      .insert([employeeData])
      .select(`
        *,
        designation:designation_id (
          id,
          designation,
          ot_rate
        ),
        role:role_id (
          id,
          role_name,
          description
        )
      `);
    
    if (error) {
      console.error('Supabase error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'Duplicate value: email, phone, or NIC already exists' });
      }
      return res.status(400).json({ success: false, message: 'Error creating employee', error: error.message });
    }
    
    // Invalidate caches
    invalidateEmployeeCaches();
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ===== UPDATE an employee =====
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      designation_id,
      phone,
      email,
      hireDate,
      birthday,
      gender,
      nic,
      address,
      marriageStatus,
      jobType,
      profileImage,
      status,
      baseSalary,
      bonus,
      role_id
    } = req.body;
    
    // Check if employee exists
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    
    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (designation_id !== undefined) updateData.designation_id = designation_id || null;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (hireDate) updateData.hire_date = hireDate;
    if (address) updateData.address = address;
    if (role_id !== undefined) updateData.role_id = role_id || null;
    if (birthday !== undefined && birthday !== '') updateData.birthday = birthday;
    else if (birthday === '') updateData.birthday = null;
    if (gender !== undefined && gender !== '') updateData.gender = gender;
    else if (gender === '') updateData.gender = null;
    if (nic !== undefined && nic !== '') updateData.nic = nic;
    else if (nic === '') updateData.nic = null;
    if (marriageStatus !== undefined && marriageStatus !== '') updateData.marriage_status = marriageStatus;
    else if (marriageStatus === '') updateData.marriage_status = null;
    if (jobType !== undefined && jobType !== '') updateData.job_type = jobType;
    else if (jobType === '') updateData.job_type = null;
    if (profileImage !== undefined) updateData.profile_image = profileImage;
    if (status) updateData.status = status;
    if (status && status !== 'rejected') {
      updateData.rejection_reason = null;
    }
    if (baseSalary !== undefined && baseSalary !== '') {
      updateData.base_salary = parseFloat(baseSalary);
    } else if (baseSalary === '') {
      updateData.base_salary = 0;
    }
    if (bonus !== undefined && bonus !== '') {
      updateData.bonus = parseFloat(bonus);
    } else if (bonus === '') {
      updateData.bonus = 0;
    }
    
    updateData.updated_at = new Date().toISOString();
    
    // Check email uniqueness
    if (email) {
      const { data: emailCheck } = await supabase
        .from('employees')
        .select('email')
        .eq('email', email)
        .neq('id', id)
        .maybeSingle();
      
      if (emailCheck) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use by another employee'
        });
      }
    }
    
    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        designation:designation_id (
          id,
          designation,
          ot_rate
        ),
        role:role_id (
          id,
          role_name,
          description
        )
      `);
    
    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error updating employee',
        error: error.message
      });
    }
    
    // Invalidate caches
    invalidateEmployeeCaches(id);
    
    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== DELETE an employee =====
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();
    
    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error deleting employee',
        error: error.message
      });
    }
    
    // Invalidate caches
    invalidateEmployeeCaches(id);
    
    res.status(200).json({
      success: true,
      message: `Employee ${existingEmployee.name} deleted successfully`
    });
  } catch (error) {
    console.error('[Employees] Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== GET employee statistics =====
exports.getEmployeeStats = async (req, res) => {
  try {
    // Check cache
    const cachedData = cache.get(CACHE_KEYS.EMPLOYEE_STATS);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: cachedData,
        fromCache: true
      });
    }
    
    const [{ count: total }, { count: active }, { count: pending }] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);
    
    const statsData = {
      total: total || 0,
      active: active || 0,
      pending: pending || 0,
      managers: 0
    };
    
    // Store in cache
    cache.set(CACHE_KEYS.EMPLOYEE_STATS, statsData, CACHE_TTL.EMPLOYEE_STATS);
    
    res.status(200).json({
      success: true,
      data: statsData
    });
  } catch (error) {
    console.error('[Employees] Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== UPDATE employee status =====
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status'
      });
    }
    
    const validStatuses = ['pending', 'active', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, active, or rejected'
      });
    }
    
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id, name, status')
      .eq('id', id)
      .maybeSingle();
    
    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };
    
    // If changing from pending to active, clear rejection reason
    if (status === 'active' && existingEmployee.status === 'rejected') {
      updateData.rejection_reason = null;
    }
    
    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        designation:designation_id (
          id,
          designation,
          ot_rate
        ),
        role:role_id (
          id,
          role_name,
          description
        )
      `);
    
    if (error) {
      console.error('[Employees] Status update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error updating employee status',
        error: error.message
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Invalidate caches
    invalidateEmployeeCaches(id);
    
    res.status(200).json({
      success: true,
      message: `Employee status updated to ${status}`,
      data: data[0]
    });
  } catch (error) {
    console.error('[Employees] Status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== GET all roles =====
exports.getAllRoles = async (req, res) => {
  try {
    console.log('[Roles] Fetching all roles...');
    
    // Check cache
    const cachedData = cache.get(CACHE_KEYS.ROLES);
    if (cachedData) {
      console.log('[Roles] Returning cached roles');
      return res.status(200).json({
        success: true,
        data: cachedData,
        fromCache: true
      });
    }
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('[Roles] Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error fetching roles',
        error: error.message
      });
    }
    
    // Store in cache
    cache.set(CACHE_KEYS.ROLES, data || [], CACHE_TTL.ROLES_LIST);
    
    console.log(`[Roles] Found ${data?.length || 0} roles`);
    
    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[Roles] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== REJECT an employee =====
exports.rejectEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required'
      });
    }

    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id, name, status')
      .eq('id', id)
      .maybeSingle();

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        designation:designation_id (
          id,
          designation,
          ot_rate
        ),
        role:role_id (
          id,
          role_name,
          description
        )
      `);

    if (error) {
      console.error('[Employees] Reject error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error rejecting employee',
        error: error.message
      });
    }

    // Invalidate caches
    invalidateEmployeeCaches(id);

    res.status(200).json({
      success: true,
      message: `Employee ${existingEmployee.name} rejected`,
      data: data[0]
    });
  } catch (error) {
    console.error('[Employees] Reject server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== ✅ ALL METHODS EXPORTED CORRECTLY =====
module.exports = {
  getAllEmployees: exports.getAllEmployees,
  getPendingEmployees: exports.getPendingEmployees,
  getEmployeeById: exports.getEmployeeById,
  createEmployee: exports.createEmployee,
  updateEmployee: exports.updateEmployee,
  deleteEmployee: exports.deleteEmployee,
  getEmployeeStats: exports.getEmployeeStats,
  updateEmployeeStatus: exports.updateEmployeeStatus,
  getAllRoles: exports.getAllRoles,
  rejectEmployee: exports.rejectEmployee,
};