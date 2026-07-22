const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  initiateGoogleOAuth, 
  handleGoogleCallback, 
  getMe,
  loginUser,
  updateProfile,
  updatePassword,
  deleteAccount,
  getUserPermissions,
  getAllRoles,
  getPermissionsByRoleName,
  getProfile,
  verifyLogin2FA,
  setup2FA,
  verifySetup2FA
} = require('../controllers/authController');

const { protect } = require('../middlewares/authMiddleware');

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', initiateGoogleOAuth);
router.post('/google/callback', handleGoogleCallback);


router.post('/login/verify-2fa', verifyLogin2FA);
router.post('/2fa/setup', setup2FA);
router.post('/2fa/verify-setup', verifySetup2FA);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/update-password', protect, updatePassword);
router.delete('/account', protect, deleteAccount);
router.get('/permissions', protect, getUserPermissions);
router.get('/roles', protect, getAllRoles);
router.get('/permissions/:roleName', protect, getPermissionsByRoleName);
router.get('/profile', protect, getProfile);

module.exports = router;