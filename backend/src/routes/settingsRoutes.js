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
  getSettingsRequests,
  getPendingRequestsCount,
  approveSettingsRequest,
  rejectSettingsRequest,
} = require('../controllers/settingsController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/public', getPublicSettings);
router.get('/security', protect, getSecuritySettings);
router.put('/security', protect, updateSecuritySettings);
router.get('/system', protect, getSystemSettings);
router.put('/system', protect, updateSystemSettings);
router.post('/reset', protect, resetSettings);

// ⚠️ /:key ekata issellā thiyenna one — "requests" kiyana key ekak widihata match wenna epa
router.get('/requests', protect, getSettingsRequests);
router.get('/requests/pending-count', protect, getPendingRequestsCount);
router.put('/requests/:id/approve', protect, approveSettingsRequest);
router.put('/requests/:id/reject', protect, rejectSettingsRequest);

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);

// Generic key-based routes — SEMA VATEMA ANTHIMATA
router.get('/:key', protect, getSettingByKey);
router.put('/:key', protect, updateSettingByKey);

module.exports = router;