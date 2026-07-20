function requireVerified2FA(req, res, next) {
  if (['admin', 'manager'].includes(req.user.role) && !req.user.two_factor_enabled) {
    return res.status(403).json({ error: '2FA_SETUP_REQUIRED' });
  }
  next();
}