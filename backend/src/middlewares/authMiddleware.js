const supabase = require('../config/db');

// Helper function to check if user has password
// ============ FILE: authMiddleware.js ============
// LOCATION: At the top of the file, after the imports

// FIXED: Helper function to check if user has password
const userHasPassword = async (userId) => {
  try {
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user) return false;
    
    const identities = user.user?.identities || [];
    
    // Check if user has an email identity (means they have a password)
    const hasEmailIdentity = identities.some(id => id.provider === 'email');
    
    // Also check user metadata
    const hasPasswordInMetadata = user.user?.user_metadata?.has_password === true;
    
    return hasEmailIdentity || hasPasswordInMetadata;
  } catch (error) {
    console.error('Error checking user password:', error);
    return false;
  }
};

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

    // Check if user has password
    const hasPassword = await userHasPassword(data.user.id);
    
    // Detect if user is from Google
    const identities = data.user.identities || [];
    const isGoogleUser = identities.some(id => id.provider === 'google');

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, address, role_id ( role_name )')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    // Attach user info to req.user
    req.user = {
      id: data.user.id,
      email: data.user.email,
      fullName: profile.full_name,
      phone: profile.phone_number || '',
      address: profile.address || '',
      role: profile.role_id?.role_name || 'CUSTOMER',
      hasPassword: hasPassword,
      provider: isGoogleUser ? 'google' : 'email'
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