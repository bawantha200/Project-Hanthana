const supabase = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, token missing.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Token එක Supabase එකෙන් verify කරනවා
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Not authorized, token invalid.' });
    }

    // Request එකට user object එක ඇමිණීම (ඊළඟ function එකට පාවිච්චි කරන්න)
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized.' });
  }
};

module.exports = { protect };