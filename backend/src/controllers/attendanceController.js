const supabase = require('../config/db');

// GET all attendance records
exports.getAllAttendance = async (req, res) => {
  try {
    const { employeeId, date, status } = req.query;
    
    let query = supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    if (date) {
      query = query.eq('date', date);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching attendance records',
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

// GET attendance by employee ID
exports.getAttendanceByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    let query = supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false });
    
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching attendance records',
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

// CREATE attendance record
exports.createAttendance = async (req, res) => {
  try {
    const {
      employeeId,
      employeeName,
      date,
      checkIn,
      checkOut,
      status
    } = req.body;
    
    // Validation
    if (!employeeId || !employeeName || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employeeId, employeeName, and date'
      });
    }
    
    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .maybeSingle();
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // Check if attendance already exists for this employee on this date
    const { data: existing, error: existingError } = await supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle();
    
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already recorded for this employee on this date'
      });
    }
    
    const attendanceData = {
      employee_id: employeeId,
      employee_name: employeeName,
      date: date,
      check_in: checkIn || null,
      check_out: checkOut || null,
      status: status || 'present',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('attendance')
      .insert([attendanceData])
      .select();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error creating attendance record',
        error: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Attendance record created successfully',
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

// UPDATE attendance record
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      checkIn,
      checkOut,
      status
    } = req.body;
    
    // Check if attendance exists
    const { data: existing, error: existingError } = await supabase
      .from('attendance')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    const updateData = {};
    if (checkIn !== undefined) updateData.check_in = checkIn;
    if (checkOut !== undefined) updateData.check_out = checkOut;
    if (status) updateData.status = status;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('attendance')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error updating attendance record',
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
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

// DELETE attendance record
exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: existing, error: existingError } = await supabase
      .from('attendance')
      .select('id, employee_name')
      .eq('id', id)
      .maybeSingle();
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error deleting attendance record',
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully',
      data: existing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// GET attendance statistics for a month
exports.getAttendanceStats = async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    
    if (!employeeId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employeeId, month, and year'
      });
    }
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;
    
    const { data, error } = await supabase
      .from('attendance')
      .select('status')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching attendance statistics',
        error: error.message
      });
    }
    
    const stats = {
      present: data.filter(r => r.status === 'present').length,
      late: data.filter(r => r.status === 'late').length,
      leave: data.filter(r => r.status === 'leave').length,
      absent: data.filter(r => r.status === 'absent').length,
      total: data.length
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};