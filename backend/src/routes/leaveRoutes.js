const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const supabase = require('../config/db'); // Note: db.js not supabase.js

// ========== GET ALL LEAVES ==========
router.get('/', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaves'
    });
  }
});

// ========== GET LEAVE BALANCE ==========
router.get('/balance/:employeeId', protect, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log(`📊 Fetching leave balance for employee: ${employeeId}`);

    if (!employeeId || isNaN(parseInt(employeeId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    const parsedId = parseInt(employeeId);

    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('leave_type, days, status')
      .eq('employee_id', parsedId)
      .in('status', ['approved', 'pending']);

    if (leavesError) {
      console.error('❌ Supabase error:', leavesError);
      throw leavesError;
    }

    console.log(`📝 Found ${leaves?.length || 0} leaves`);

    const usedLeaves = {};
    if (leaves) {
      leaves.forEach(leave => {
        const type = leave.leave_type;
        if (!usedLeaves[type]) usedLeaves[type] = 0;
        usedLeaves[type] += leave.days || 1;
      });
    }

    const MAX_LEAVES = {
      'Annual Leave': 14,
      'Sick Leave': 7,
      'Casual Leave': 5,
      'Maternity Leave': 84,
      'Paternity Leave': 3,
      'Bereavement Leave': 3,
      'Public Holiday': 5,
      'Other': 10
    };

    const balance = {};
    Object.keys(MAX_LEAVES).forEach(type => {
      const used = usedLeaves[type] || 0;
      const max = MAX_LEAVES[type];
      const remaining = Math.max(0, max - used);
      balance[type] = {
        max: max,
        used: used,
        remaining: remaining,
        isExhausted: used >= max
      };
    });

    console.log('✅ Balance calculated successfully');

    res.json({
      success: true,
      data: balance
    });

  } catch (error) {
    console.error('❌ Error fetching leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance',
      error: error.message
    });
  }
});

// ========== GET SINGLE LEAVE ==========
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Leave record not found'
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave record'
    });
  }
});

// ========== CREATE LEAVE ==========
router.post('/', protect, async (req, res) => {
  try {
    const {
      employeeId,
      employeeName,
      leaveType,
      startDate,
      endDate,
      reason,
      status,
      days
    } = req.body;

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const { data, error } = await supabase
      .from('leaves')
      .insert([{
        employee_id: parseInt(employeeId),
        employee_name: employeeName,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || '',
        status: status || 'pending',
        days: days || 1
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data[0],
      message: 'Leave request created successfully'
    });
  } catch (error) {
    console.error('Error creating leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave request'
    });
  }
});

// ========== UPDATE LEAVE ==========
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      status,
      days
    } = req.body;

    const updateData = {};
    if (leaveType !== undefined) updateData.leave_type = leaveType;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (reason !== undefined) updateData.reason = reason;
    if (status !== undefined) updateData.status = status;
    if (days !== undefined) updateData.days = days;

    const { data, error } = await supabase
      .from('leaves')
      .update(updateData)
      .eq('id', parseInt(id))
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave record not found'
      });
    }

    res.json({
      success: true,
      data: data[0],
      message: 'Leave request updated successfully'
    });
  } catch (error) {
    console.error('Error updating leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave request'
    });
  }
});

// ========== DELETE LEAVE ==========
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('leaves')
      .delete()
      .eq('id', parseInt(id))
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave record not found'
      });
    }

    res.json({
      success: true,
      message: 'Leave request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave request'
    });
  }
});

module.exports = router;