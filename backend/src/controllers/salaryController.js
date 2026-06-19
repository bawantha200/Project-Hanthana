const supabase = require('../config/db');

// GET all salary records
exports.getAllSalaries = async (req, res) => {
  try {
    const { employeeId, month, paid } = req.query;
    
    let query = supabase
      .from('salaries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    if (month) {
      query = query.eq('month', month);
    }
    
    if (paid !== undefined) {
      query = query.eq('paid', paid === 'true');
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching salary records',
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

// GET salary by employee ID
exports.getSalaryByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;
    
    let query = supabase
      .from('salaries')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });
    
    if (month) {
      query = query.eq('month', month);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching salary records',
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

// CREATE salary record
exports.createSalary = async (req, res) => {
  try {
    const {
      employeeId,
      employeeName,
      month,
      baseSalary,
      otHours,
      bonus
    } = req.body;
    
    // Validation
    if (!employeeId || !employeeName || !month || !baseSalary) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employeeId, employeeName, month, and baseSalary'
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
    
    // Check if salary already exists for this employee this month
    const { data: existing, error: existingError } = await supabase
      .from('salaries')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('month', month)
      .maybeSingle();
    
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Salary already recorded for this employee this month'
      });
    }
    
    const otRate = 500; // Default OT rate
    const otHoursNum = parseFloat(otHours) || 0;
    const otAmount = otHoursNum * otRate;
    const baseNum = parseFloat(baseSalary) || 0;
    const bonusNum = parseFloat(bonus) || 0;
    const totalSalary = baseNum + otAmount + bonusNum;
    
    const salaryData = {
      employee_id: employeeId,
      employee_name: employeeName,
      month: month,
      base_salary: baseNum,
      ot_hours: otHoursNum,
      ot_amount: otAmount,
      bonus: bonusNum,
      total_salary: totalSalary,
      paid: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('salaries')
      .insert([salaryData])
      .select();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error creating salary record',
        error: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Salary record created successfully',
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

// UPDATE salary record
exports.updateSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      baseSalary,
      otHours,
      bonus,
      paid
    } = req.body;
    
    // Check if salary exists
    const { data: existing, error: existingError } = await supabase
      .from('salaries')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }
    
    const updateData = {};
    const otRate = 500;
    
    if (baseSalary !== undefined) {
      updateData.base_salary = parseFloat(baseSalary);
    }
    
    if (otHours !== undefined) {
      const otHoursNum = parseFloat(otHours) || 0;
      updateData.ot_hours = otHoursNum;
      updateData.ot_amount = otHoursNum * otRate;
    }
    
    if (bonus !== undefined) {
      updateData.bonus = parseFloat(bonus);
    }
    
    if (paid !== undefined) {
      updateData.paid = paid === true || paid === 'true';
    }
    
    // Recalculate total salary
    const baseNum = updateData.base_salary || existing.base_salary;
    const otAmount = updateData.ot_amount || existing.ot_amount;
    const bonusNum = updateData.bonus || existing.bonus;
    updateData.total_salary = parseFloat(baseNum) + parseFloat(otAmount) + parseFloat(bonusNum);
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('salaries')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error updating salary record',
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Salary record updated successfully',
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

// DELETE salary record
exports.deleteSalary = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: existing, error: existingError } = await supabase
      .from('salaries')
      .select('id, employee_name')
      .eq('id', id)
      .maybeSingle();
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }
    
    const { error } = await supabase
      .from('salaries')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error deleting salary record',
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Salary record deleted successfully',
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

// GET salary summary for a month
exports.getSalarySummary = async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Please provide month'
      });
    }
    
    const { data, error } = await supabase
      .from('salaries')
      .select('*')
      .eq('month', month);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error fetching salary summary',
        error: error.message
      });
    }
    
    const summary = {
      totalEmployees: data.length,
      totalBaseSalary: data.reduce((sum, r) => sum + parseFloat(r.base_salary), 0),
      totalOTHours: data.reduce((sum, r) => sum + parseFloat(r.ot_hours), 0),
      totalOTAmount: data.reduce((sum, r) => sum + parseFloat(r.ot_amount), 0),
      totalBonus: data.reduce((sum, r) => sum + parseFloat(r.bonus), 0),
      totalSalary: data.reduce((sum, r) => sum + parseFloat(r.total_salary), 0),
      paidCount: data.filter(r => r.paid).length,
      pendingCount: data.filter(r => !r.paid).length
    };
    
    res.status(200).json({
      success: true,
      data: summary,
      records: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Mark salary as paid
exports.markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('salaries')
      .update({ 
        paid: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error updating salary status',
        error: error.message
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Salary marked as paid',
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