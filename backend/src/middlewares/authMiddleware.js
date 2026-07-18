const supabase = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token missing'
      });
    }

    const token = authHeader.split(' ')[1];

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid.'
      });
    }

    // ✅ Profile eken role eka fetch karanna - loginUser eke ekama pattern eka
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role_id ( role_name )')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    // ✅ req.user eke role eka thiyennna widiyata attach karanna
    req.user = {
      id: data.user.id,
      email: data.user.email,
      fullName: profile.full_name,
      role: profile.role_id?.role_name || 'CUSTOMER',
    };

    next();

  } catch (err) {
    console.log("PROTECT ERROR:", err);
    return res.status(401).json({
      success: false,
      message: 'Not authorized.'
    });
  }
};

module.exports = { protect };