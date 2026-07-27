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
  markRejectedRequestsSeen,
  markSingleRequestSeen,
} = require('../controllers/settingsController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/public', getPublicSettings);
router.get('/security', protect, getSecuritySettings);
router.put('/security', protect, updateSecuritySettings);
router.get('/system', protect, getSystemSettings);
router.put('/system', protect, updateSystemSettings);
router.post('/reset', protect, resetSettings);

router.get('/requests', protect, getSettingsRequests);
router.get('/requests/pending-count', protect, getPendingRequestsCount);
router.put('/requests/mark-seen', protect, markRejectedRequestsSeen);
router.put('/requests/:id/mark-seen', protect, markSingleRequestSeen);
router.put('/requests/:id/approve', protect, approveSettingsRequest);
router.put('/requests/:id/reject', protect, rejectSettingsRequest);

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);

router.get('/:key', protect, getSettingByKey);
router.put('/:key', protect, updateSettingByKey);

module.exports = router;