// backend/src/controllers/designationController.js
const supabase = require('../config/db');

// ===== GET all designations =====
exports.getAllDesignations = async (req, res) => {
  try {
    console.log('[Designation] Fetching all designations...');

    const { data, error } = await supabase
      .from('designation')
      .select('*')
      .order('designation', { ascending: true });

    if (error) {
      console.error('[Designation] Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error fetching designations',
        error: error.message
      });
    }

    console.log(`[Designation] Found ${data?.length || 0} designations`);

    res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('[Designation] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== GET a single designation by ID =====
exports.getDesignationById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('designation')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('[Designation] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== CREATE a new designation =====
exports.createDesignation = async (req, res) => {
  try {
    const { designation, ot_rate } = req.body;

    // Validate input
    if (!designation || designation.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Designation name is required'
      });
    }

    const trimmedDesignation = designation.trim();

    // Check if designation already exists
    const { data: existingDesignation } = await supabase
      .from('designation')
      .select('id, designation')
      .ilike('designation', trimmedDesignation)
      .maybeSingle();

    if (existingDesignation) {
      return res.status(409).json({
        success: false,
        message: `Designation "${trimmedDesignation}" already exists`
      });
    }

    // Set OT rate - default to 500 if not provided
    const otRate = ot_rate !== undefined && ot_rate !== null && ot_rate !== '' 
      ? parseFloat(ot_rate) 
      : 500;

    // Insert new designation with OT rate
    const { data, error } = await supabase
      .from('designation')
      .insert([{
        designation: trimmedDesignation,
        ot_rate: otRate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('[Designation] Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error creating designation',
        error: error.message
      });
    }

    console.log(`[Designation] Created: "${trimmedDesignation}" with OT rate: ${otRate}`);

    res.status(201).json({
      success: true,
      message: `Designation "${trimmedDesignation}" created successfully`,
      data: data[0]
    });
  } catch (error) {
    console.error('[Designation] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== UPDATE a designation =====
exports.updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, ot_rate } = req.body;

    if (!designation || designation.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Designation name is required'
      });
    }

    const trimmedDesignation = designation.trim();

    // Check if designation exists
    const { data: existingDesignation } = await supabase
      .from('designation')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existingDesignation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    // Check if new designation name already exists (excluding current)
    const { data: duplicateCheck } = await supabase
      .from('designation')
      .select('id')
      .ilike('designation', trimmedDesignation)
      .neq('id', id)
      .maybeSingle();

    if (duplicateCheck) {
      return res.status(409).json({
        success: false,
        message: `Designation "${trimmedDesignation}" already exists`
      });
    }

    // Set OT rate - default to 500 if not provided
    const otRate = ot_rate !== undefined && ot_rate !== null && ot_rate !== '' 
      ? parseFloat(ot_rate) 
      : 500;

    // Update designation with OT rate
    const { data, error } = await supabase
      .from('designation')
      .update({
        designation: trimmedDesignation,
        ot_rate: otRate,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('[Designation] Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error updating designation',
        error: error.message
      });
    }

    console.log(`[Designation] Updated: "${trimmedDesignation}" (ID: ${id}) with OT rate: ${otRate}`);

    res.status(200).json({
      success: true,
      message: `Designation updated successfully`,
      data: data[0]
    });
  } catch (error) {
    console.error('[Designation] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== DELETE a designation =====
exports.deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if designation exists
    const { data: existingDesignation } = await supabase
      .from('designation')
      .select('id, designation')
      .eq('id', id)
      .maybeSingle();

    if (!existingDesignation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    // Check if designation is being used by any employee
    const { data: employeesWithDesignation, error: checkError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('designation_id', id)
      .limit(5);

    if (employeesWithDesignation && employeesWithDesignation.length > 0) {
      const employeeNames = employeesWithDesignation.map(e => e.name).join(', ');
      return res.status(409).json({
        success: false,
        message: `Cannot delete designation "${existingDesignation.designation}". It is currently assigned to ${employeesWithDesignation.length} employee(s): ${employeeNames}${employeesWithDesignation.length > 5 ? '...' : ''}`,
        assignedEmployees: employeesWithDesignation,
        employeeCount: employeesWithDesignation.length
      });
    }

    // Delete designation
    const { error } = await supabase
      .from('designation')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Designation] Supabase error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error deleting designation',
        error: error.message
      });
    }

    console.log(`[Designation] Deleted: "${existingDesignation.designation}" (ID: ${id})`);

    res.status(200).json({
      success: true,
      message: `Designation "${existingDesignation.designation}" deleted successfully`,
      data: {
        id: id,
        designation: existingDesignation.designation
      }
    });
  } catch (error) {
    console.error('[Designation] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== GET designation statistics =====
exports.getDesignationStats = async (req, res) => {
  try {
    // Get all designations with employee count
    const { data, error } = await supabase
      .from('designation')
      .select(`
        id,
        designation,
        ot_rate,
        created_at,
        employees:employees_count
      `);

    if (error) {
      console.error('[Designation] Stats error:', error);
      return res.status(400).json({
        success: false,
        message: 'Error fetching designation stats',
        error: error.message
      });
    }

    // Count employees per designation
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('designation_id, status');

    const counts = {};
    if (allEmployees) {
      allEmployees.forEach(emp => {
        if (emp.designation_id) {
          counts[emp.designation_id] = (counts[emp.designation_id] || 0) + 1;
        }
      });
    }

    const designationsWithStats = data?.map(des => ({
      ...des,
      employeeCount: counts[des.id] || 0
    })) || [];

    res.status(200).json({
      success: true,
      data: designationsWithStats,
      total: designationsWithStats.length
    });
  } catch (error) {
    console.error('[Designation] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ===== GET designations with employee counts =====
exports.getDesignationsWithEmployeeCount = async (req, res) => {
  try {
    // Get all designations
    const { data: designations, error: desError } = await supabase
      .from('designation')
      .select('*')
      .order('designation', { ascending: true });

    if (desError) {
      throw desError;
    }

    // Get employee counts per designation
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('designation_id, id');

    if (empError) {
      throw empError;
    }

    // Count employees per designation
    const counts = {};
    employees?.forEach(emp => {
      if (emp.designation_id) {
        counts[emp.designation_id] = (counts[emp.designation_id] || 0) + 1;
      }
    });

    const result = designations?.map(des => ({
      ...des,
      employee_count: counts[des.id] || 0
    })) || [];

    res.status(200).json({
      success: true,
      data: result,
      total: result.length
    });
  } catch (error) {
    console.error('[Designation] Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllDesignations: exports.getAllDesignations,
  getDesignationById: exports.getDesignationById,
  createDesignation: exports.createDesignation,
  updateDesignation: exports.updateDesignation,
  deleteDesignation: exports.deleteDesignation,
  getDesignationStats: exports.getDesignationStats,
  getDesignationsWithEmployeeCount: exports.getDesignationsWithEmployeeCount
};