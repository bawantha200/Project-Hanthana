const supabase = require('../config/db');

// GET all employees with optional filters
exports.getAllEmployees = async (req, res) => {
  try {
    const { position, status, search } = req.query;
    
    console.log('[Employees] Fetching with params:', { position, status, search });
    
    let query = supabase
      .from('employees')
      .select('*');
    
    if (position && position !== 'All') {
      query = query.eq('position', position);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,position.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    const { data, error } = await query.order('id', { ascending: false });
    
    if (error) {
      console.error('[Employees] Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error fetching employees',
        error: error.message
      });
    }
    
    console.log(`[Employees] Found ${data?.length || 0} employees`);
    
    res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
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
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
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
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
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
      position,
      designation,    // ✅ ADDED - Designation field
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
      bonus
    } = req.body;
    
    // Required fields validation
    if (!name || !email || !phone || !position || !address || !hireDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, phone, position, address, hireDate'
      });
    }
    
    // Check if employee with same email exists
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'Employee with this email already exists'
      });
    }
    
    // Prepare employee data with designation
    const employeeData = {
      name,
      position,
      designation: designation || position,  // ✅ ADDED - Use designation if provided, else use position
      phone,
      email,
      hire_date: hireDate,
      status: 'pending',
      role: 'EMPLOYEE',
      gender: gender || null,
      nic: nic || null,
      address,
      marriage_status: marriageStatus || null,
      job_type: jobType || null,
      profile_image: profileImage || null,
      base_salary: baseSalary ? parseFloat(baseSalary) : 0,
      bonus: bonus ? parseFloat(bonus) : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('[Employees] Creating employee with data:', employeeData);
    
    const { data, error } = await supabase
      .from('employees')
      .insert([employeeData])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error creating employee',
        error: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully (pending)',
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

// ===== UPDATE an employee =====
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      position,
      designation,    // ✅ ADDED - Designation field
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
      bonus
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
    
    // Build update data object
    const updateData = {};
    if (name) updateData.name = name;
    if (position) updateData.position = position;
    if (designation) updateData.designation = designation;  // ✅ ADDED - Update designation if provided
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (hireDate) updateData.hire_date = hireDate;
    if (address) updateData.address = address;
    
    // Optional fields
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
    
    // Base Salary
    if (baseSalary !== undefined && baseSalary !== '') {
      updateData.base_salary = parseFloat(baseSalary);
    } else if (baseSalary === '') {
      updateData.base_salary = 0;
    }
    
    // Bonus
    if (bonus !== undefined && bonus !== '') {
      updateData.bonus = parseFloat(bonus);
    } else if (bonus === '') {
      updateData.bonus = 0;
    }
    
    updateData.updated_at = new Date().toISOString();
    
    console.log('[Employees] Updating employee with data:', updateData);
    
    // Check email uniqueness if email is being updated
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
      .select();
    
    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error updating employee',
        error: error.message
      });
    }
    
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
    
    res.status(200).json({
      success: true,
      message: `Employee ${existingEmployee.name} deleted successfully`
    });
  } catch (error) {
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
    const { data: totalData } = await supabase.from('employees').select('id', { count: 'exact' });
    const { data: activeData } = await supabase.from('employees').select('id', { count: 'exact' }).eq('status', 'active');
    const { data: pendingData } = await supabase.from('employees').select('id', { count: 'exact' }).eq('status', 'pending');
    
    res.status(200).json({
      success: true,
      data: {
        total: totalData?.length || 0,
        active: activeData?.length || 0,
        pending: pendingData?.length || 0,
        managers: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== Update employee status =====
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
    
    const validStatuses = ['pending', 'active'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, or active'
      });
    }
    
    const { data, error } = await supabase
      .from('employees')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
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
    
    res.status(200).json({
      success: true,
      message: 'Employee status updated successfully',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllEmployees: exports.getAllEmployees,
  getPendingEmployees: exports.getPendingEmployees,
  getEmployeeById: exports.getEmployeeById,
  createEmployee: exports.createEmployee,
  updateEmployee: exports.updateEmployee,
  deleteEmployee: exports.deleteEmployee,
  getEmployeeStats: exports.getEmployeeStats,
  updateEmployeeStatus: exports.updateEmployeeStatus
};