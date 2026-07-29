const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  initiateGoogleOAuth, 
  handleGoogleCallback, 
  getMe,
  loginUser,
  updateProfile,
  updateAddress,
  updatePassword,
  setPasswordForGoogleUser, // Add this
  deleteAccount,
  getUserPermissions,
  getAllRoles,
  getPermissionsByRoleName,
  getProfile,
  verifyLogin2FA,
  setup2FA,
  verifySetup2FA,
  changeEmail,
  resendEmailVerification,
  cancelEmailChange,
  verifyEmailChange,
  decodeToken,
  registerPhase1,
  registerPhase2,
  createGoogleUserProfile,
  updateGoogleUserProfile,
  checkPasswordStatus,
} = require('../controllers/authController');

const { protect } = require('../middlewares/authMiddleware');

// Phase 1: Email, Password, Full Name
router.post('/register/phase1', registerPhase1);

// Phase 2: Address and Phone
router.post('/register/phase2', registerPhase2);

// Google Sign-In Profile Completion
router.post('/google/create-profile', protect, createGoogleUserProfile);
router.put('/google/update-profile', protect, updateGoogleUserProfile);

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', initiateGoogleOAuth);
router.post('/google/callback', handleGoogleCallback);

router.post('/login/verify-2fa', verifyLogin2FA);
router.post('/2fa/setup', setup2FA);
router.post('/2fa/verify-setup', verifySetup2FA);

// Public routes (no authentication required)
router.get('/decode-token/:token', decodeToken);
router.post('/verify-email/:token', verifyEmailChange);

// Protected routes (authentication required)
router.put('/change-email', protect, changeEmail);
router.post('/resend-email-verification', protect, resendEmailVerification);
router.post('/cancel-email-change', protect, cancelEmailChange);

// Protected Routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/address', protect, updateAddress);
router.put('/update-password', protect, updatePassword);
router.post('/set-password', protect, setPasswordForGoogleUser); // Add this
router.delete('/account', protect, deleteAccount);
router.get('/permissions', protect, getUserPermissions);
router.get('/roles', protect, getAllRoles);
router.get('/permissions/:roleName', protect, getPermissionsByRoleName);
router.get('/profile', protect, getProfile);
// Add the route
router.get('/check-password', checkPasswordStatus);
module.exports = router;