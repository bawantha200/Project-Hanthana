const userService = require('../services/userService');

// ===== GET ALL USERS (Profiles only) =====
const getUsers = async (req, res) => {
  try {
    console.log('[Users] 🚀 Fetching all users...');
    const users = await userService.getAllUsers();

    return res.status(200).json({
      success: true,
      data: users || []
    });
  } catch (error) {
    console.error('[Users] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// ===== GET USER BY ID =====
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[Users] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// ===== CREATE USER =====
const createUser = async (req, res) => {
  try {
    const { fullName, email, phone, address, role, password } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, password and role are required.'
      });
    }

    const user = await userService.createUser({
      fullName, email, phone, address, role, password
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('[Users] ❌ Create error:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// ===== CREATE USER FROM EMPLOYEE =====
const createUserFromEmployee = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    const user = await userService.createUserFromEmployee(employeeId, password);

    return res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: user
    });
  } catch (error) {
    console.error('[Users] ❌ Create from employee error:', error);

    if (error.message === 'Employee not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// ===== UPDATE USER =====
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, address, role, status } = req.body;

    if (!fullName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email and role are required.'
      });
    }

    const updated = await userService.updateUser(id, {
      fullName, email, phone, address, role, status
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('[Users] ❌ Update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// ===== DELETE USER =====
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('[Users] ❌ Delete error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// ===== UPDATE USER STATUS =====
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'active'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "pending" or "active".'
      });
    }

    await userService.updateUserStatus(id, status);

    return res.status(200).json({
      success: true,
      message: `User status updated to ${status}`
    });
  } catch (error) {
    console.error('[Users] ❌ Status update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  createUserFromEmployee,
  updateUser,
  deleteUser,
  updateUserStatus
};