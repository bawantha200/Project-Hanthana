const supabase = require('../config/db');

// GET all employees with optional filters
exports.getAllEmployees = async (req, res) => {
  try {
    const { position, status, search } = req.query;
    
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
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching employees',
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// GET a single employee by ID
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

// CREATE a new employee
exports.createEmployee = async (req, res) => {
  try {
    const {
      name,
      position,
      phone,
      email,
      hireDate,
      birthday,
      gender,
      nic,
      address,
      marriageStatus,
      jobType,
      profileImage
    } = req.body;
    
    // Validation - required fields
    if (!name || !email || !phone || !position || !address || !hireDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, phone, position, address, hireDate'
      });
    }
    
    // Check if employee with same email exists
    const { data: existingEmployee, error: checkError } = await supabase
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
    
    const employeeData = {
      name,
      position,
      phone,
      email,
      hire_date: hireDate,
      status: 'active',
      role: 'EMPLOYEE',
      gender: gender || null,
      nic: nic || null,
      address,
      marriage_status: marriageStatus || null,
      job_type: jobType || null,
      profile_image: profileImage || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
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
      message: 'Employee created successfully',
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

// UPDATE an employee - FIXED VERSION
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      position,
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
      status
    } = req.body;
    
    console.log('Updating employee with data:', req.body); // Debug log
    
    // Check if employee exists
    const { data: existingEmployee, error: checkError } = await supabase
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
    
    // Build update data - only include fields that are provided
    const updateData = {};
    
    // Required fields - must be provided
    if (name) updateData.name = name;
    if (position) updateData.position = position;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (hireDate) updateData.hire_date = hireDate;
    if (address) updateData.address = address;
    
    // Optional fields - can be null
    if (birthday !== undefined && birthday !== '') {
      updateData.birthday = birthday;
    } else if (birthday === '') {
      updateData.birthday = null;
    }
    
    if (gender !== undefined && gender !== '') {
      updateData.gender = gender;
    } else if (gender === '') {
      updateData.gender = null;
    }
    
    if (nic !== undefined && nic !== '') {
      updateData.nic = nic;
    } else if (nic === '') {
      updateData.nic = null;
    }
    
    if (marriageStatus !== undefined && marriageStatus !== '') {
      updateData.marriage_status = marriageStatus;
    } else if (marriageStatus === '') {
      updateData.marriage_status = null;
    }
    
    if (jobType !== undefined && jobType !== '') {
      updateData.job_type = jobType;
    } else if (jobType === '') {
      updateData.job_type = null;
    }
    
    if (profileImage !== undefined) {
      updateData.profile_image = profileImage;
    }
    
    if (status) {
      updateData.status = status;
    }
    
    updateData.updated_at = new Date().toISOString();
    
    // Check if email is being changed and if it's already taken
    if (email) {
      const { data: emailCheck, error: emailError } = await supabase
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
    
    console.log('Update data:', updateData); // Debug log
    
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

// DELETE an employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: existingEmployee, error: checkError } = await supabase
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
      message: `Employee ${existingEmployee.name} deleted successfully`,
      data: existingEmployee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// GET employee statistics
exports.getEmployeeStats = async (req, res) => {
  try {
    const { data: totalData, error: totalError } = await supabase
      .from('employees')
      .select('id', { count: 'exact' });
    
    const { data: activeData, error: activeError } = await supabase
      .from('employees')
      .select('id', { count: 'exact' })
      .eq('status', 'active');
    
    const { data: leaveData, error: leaveError } = await supabase
      .from('employees')
      .select('id', { count: 'exact' })
      .eq('status', 'on_leave');
    
    const { data: managerData, error: managerError } = await supabase
      .from('employees')
      .select('id', { count: 'exact' })
      .eq('role', 'MANAGER');
    
    if (totalError || activeError || leaveError || managerError) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching employee statistics'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        total: totalData.length,
        active: activeData.length,
        onLeave: leaveData.length,
        managers: managerData.length
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

// Update employee status
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
    
    const validStatuses = ['active', 'on_leave', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: active, on_leave, or inactive'
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