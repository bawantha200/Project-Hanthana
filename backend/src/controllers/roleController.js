const supabase = require('../config/db');

// Roles that ship with the system and can't be renamed/deleted from the UI.
// Keep this in sync with PROTECTED_ROLES on the frontend.
const PROTECTED_ROLES = ['ADMIN', 'CEO', 'CUSTOMER', 'MANAGER', 'EMPLOYEE'];

const formatRoleName = (name) =>
  (name || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');

const getRoles = async (req, res) => {
  try {
    console.log('[Roles] Fetching all roles from database...');

    const { data, error } = await supabase
      .from('roles')
      .select('id, role_name')
      .order('id', { ascending: true });

    if (error) {
      console.error('[Roles] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

    console.log(`[Roles] Successfully fetched ${data?.length || 0} roles`);

    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[Roles] Server error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

const createRole = async (req, res) => {
  try {
    const { role_name } = req.body;

    if (!role_name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const formatted = formatRoleName(role_name);

    if (!formatted) {
      return res.status(400).json({ success: false, message: 'Role name is invalid' });
    }

    if (PROTECTED_ROLES.includes(formatted)) {
      return res.status(400).json({ success: false, message: 'This role name is reserved' });
    }

    // Prevent duplicates
    const { data: existing, error: existingError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', formatted)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return res.status(409).json({ success: false, message: 'A role with this name already exists' });
    }

    const { data, error } = await supabase
      .from('roles')
      .insert({ role_name: formatted })
      .select()
      .single();

    if (error) throw error;

    console.log(`[Roles] Created role "${formatted}" (id: ${data.id})`);

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[Roles] ❌ Create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ PUT /api/roles/:id — rename a role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_name } = req.body;

    if (!role_name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const formatted = formatRoleName(role_name);

    if (!formatted) {
      return res.status(400).json({ success: false, message: 'Role name is invalid' });
    }

    // Fetch the current role
    const { data: currentRole, error: fetchError } = await supabase
      .from('roles')
      .select('id, role_name')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!currentRole) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (PROTECTED_ROLES.includes(currentRole.role_name)) {
      return res.status(403).json({ success: false, message: 'This role cannot be renamed' });
    }

    if (PROTECTED_ROLES.includes(formatted)) {
      return res.status(400).json({ success: false, message: 'This role name is reserved' });
    }

    // Prevent renaming into a name that already exists on another role
    const { data: dupe, error: dupeError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', formatted)
      .neq('id', id)
      .maybeSingle();

    if (dupeError) throw dupeError;

    if (dupe) {
      return res.status(409).json({ success: false, message: 'A role with this name already exists' });
    }

    const { data, error } = await supabase
      .from('roles')
      .update({ role_name: formatted })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // NOTE: profiles.role_id is an integer FK to roles.id, so renaming a role
    // does NOT require touching profiles at all — every profile pointing at
    // this role_id automatically "sees" the new name with no cascade needed.

    console.log(`[Roles] Renamed role "${currentRole.role_name}" → "${formatted}" (id: ${id})`);

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[Roles] ❌ Update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ DELETE /api/roles/:id
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: role, error: fetchError } = await supabase
      .from('roles')
      .select('id, role_name')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (PROTECTED_ROLES.includes(role.role_name)) {
      return res.status(403).json({ success: false, message: 'This role cannot be deleted' });
    }

    // Block deletion if any profile still has this role assigned.
    // profiles.role_id is an integer FK to roles.id.
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', id);

    if (countError) throw countError;

    if (count && count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete this role: ${count} user(s) are still assigned to it. Reassign them first.`
      });
    }

    // Clean up role_permissions rows tied to this role first
    const { error: permsDeleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', id);

    if (permsDeleteError) throw permsDeleteError;

    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    console.log(`[Roles] Deleted role "${role.role_name}" (id: ${id})`);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Roles] ❌ Delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};