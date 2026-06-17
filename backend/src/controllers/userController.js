const crypto = require("crypto");
const { supabase } = require("../config/db");

const createUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      address,
      password,
      role,
      departmentId,
      positionId,
      jobType,
      hireDate,
      status,
    } = req.body;

    if (
      !fullName ||
      !email ||
      !password ||
      !role ||
      !jobType ||
      !hireDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone_number: phone,
        },
      });

    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message,
      });
    }

    const authUser = authData.user;

    // Update profile created by trigger
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        phone_number: phone,
        address,
        role_id: role,
      })
      .eq("id", authUser.id);

    if (profileError) {
      await supabase.auth.admin.deleteUser(authUser.id);

      return res.status(400).json({
        success: false,
        message: profileError.message,
      });
    }

    // Insert employee only for MANAGER and EMPLOYEE
if (role === 2 || role === 3) {
  const employeeId = crypto.randomUUID();

  const { error: employeeError } = await supabase
    .from("employees")
    .insert({
      id: employeeId,
      profile_id: authUser.id,
      department_id: departmentId,
      position_id: positionId,
      job_type: jobType,
      hire_date: hireDate,
      status: status || "active",
    });

  if (employeeError) {
    await supabase
      .from("profiles")
      .delete()
      .eq("id", authUser.id);

    await supabase.auth.admin.deleteUser(authUser.id);

    return res.status(400).json({
      success: false,
      message: employeeError.message,
    });
  }
}

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: {
        id: authUser.id,
        email,
        fullName,
      },
    });
  } catch (error) {
    console.error("Create User Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone_number,
        address,
        created_at,
        roles (
          id,
          role_name
        ),
        employees (
          id,
          job_type,
          status,
          hire_date,
          departments (
            department_name
          ),
          positions (
            position_name
          )
        )
      `);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      fullName,
      email,
      phone,
      address,
      role,
      departmentId,
      positionId,
      jobType,
      hireDate,
      status,
    } = req.body;

    // update profile
    const { error: profileError } =
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          email,
          phone_number: phone,
          address,
          role_id: role,
        })
        .eq("id", id);

    if (profileError) throw profileError;

    // update employee
    const { error: employeeError } =
      await supabase
        .from("employees")
        .update({
          department_id: departmentId,
          position_id: positionId,
          job_type: jobType,
          hire_date: hireDate,
          status,
        })
        .eq("profile_id", id);

    if (employeeError) throw employeeError;

    res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete employee
    const { error: employeeError } = await supabase
      .from("employees")
      .delete()
      .eq("profile_id", id);

    if (employeeError) throw employeeError;

    // Delete profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) throw profileError;

    // Delete auth user
    const { error: authError } =
      await supabase.auth.admin.deleteUser(id);

    if (authError) throw authError;

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// userController.js හි අනෙක් functions එක්ක එකතු කරන්න

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['active', 'inactive', 'on_leave'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active", "inactive", or "on_leave".'
      });
    }

    // Update employees table status
    const { error } = await supabase
      .from('employees')
      .update({ status })
      .eq('profile_id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'User status updated successfully.'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  updateUserStatus,
  
};