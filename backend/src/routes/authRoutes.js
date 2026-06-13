const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  initiateGoogleOAuth, 
  handleGoogleCallback, 
  getMe,
  loginUser 
} = require('../controllers/authController');

// Standard email/password customer registration flow
router.post('/register', registerUser);
router.post('/login', loginUser);

// OAuth flows routing via intermediate gateway
router.post('/google', initiateGoogleOAuth);
router.post('/google/callback', handleGoogleCallback);

// Profile initialization endpoint to fetch dynamic user roles and permissions
router.get('/me', getMe);

module.exports = router;