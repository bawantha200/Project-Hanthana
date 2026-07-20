// backend/src/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSettings,
  getSettingByKey,
  updateSettings,
  updateSettingByKey,
  resetSettings,
  getSecuritySettings,
  updateSecuritySettings,
  updateSystemSettings,
  getSystemSettings,
  getPublicSettings,
} = require('../controllers/settingsController');
const { protect } = require('../middlewares/authMiddleware');

// ⚠️ Specific routes ISSELLA — generic /:key eka SEMA VATEMA ANTHIMATA
router.get('/public', getPublicSettings);
router.get('/security', protect, getSecuritySettings);
router.put('/security', protect, updateSecuritySettings);
router.get('/system', protect, getSystemSettings);       // ✅ meka /:key ekata issellā thiyenna one
router.put('/system', protect, updateSystemSettings);    // ✅ meka /:key ekata issellā thiyenna one
router.post('/reset', protect, resetSettings);

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);

// ⚠️ Generic key-based routes — SEMA VATEMA ANTHIMATA thiyenna one
router.get('/:key', protect, getSettingByKey);
router.put('/:key', protect, updateSettingByKey);

module.exports = router;