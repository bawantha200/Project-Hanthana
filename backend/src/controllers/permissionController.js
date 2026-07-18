const supabase = require("../config/db");

// Okkoma permissions ganna
const getAllPermissions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("permission_name");

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Specific role ekakata thiyena permissions ganna
const getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { data, error } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .eq("role_id", roleId);

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Role ekata permission ekak danna
const assignPermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;
    const { data, error } = await supabase
      .from("role_permissions")
      .insert({ role_id: roleId, permission_id: permissionId });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Role eken permission ekak ain karanna
const removePermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllPermissions,
  getRolePermissions,
  assignPermission,
  removePermission,
};