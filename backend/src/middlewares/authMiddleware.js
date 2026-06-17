const { supabase } = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("AUTH HEADER:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token missing'
      });
    }

    const token = authHeader.split(' ')[1];

    console.log("TOKEN:", token);

    const { data, error } = await supabase.auth.getUser(token);

    console.log("SUPABASE DATA:", data);
    console.log("SUPABASE ERROR:", error);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid.'
      });
    }

    req.user = data.user;
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