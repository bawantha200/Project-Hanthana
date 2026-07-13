const  supabase  = require('../config/db');

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

    const { data, error } = await supabase
      .from('roles')
      .insert({ role_name })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[Roles] ❌ Create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRoles,
  createRole,
};

// module.exports = { getRoles };