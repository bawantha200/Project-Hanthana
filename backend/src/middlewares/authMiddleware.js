const supabase = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token missing',
      });
    }

    const token = authHeader.split(' ')[1];

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      // Log the error for debugging (optional, remove in production)
      console.error('Supabase auth error:', error?.message || 'User not found');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid.',
      });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error('Protect middleware error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized.',
    });
  }
};

module.exports = { protect };