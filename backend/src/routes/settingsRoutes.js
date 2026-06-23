const express = require('express');
const router = express.Router();
const {
  getSettings,
  getSettingByKey,
  updateSettings,
  updateSettingByKey,
  resetSettings
} = require('../controllers/settingsController');
const { protect } = require('../middlewares/authMiddleware');

// ==========================================
// All routes require authentication
// ==========================================
router.use(protect);

// ==========================================
// GET Routes
// ==========================================
// Get all settings
router.get('/', getSettings);

// Get specific setting by key
router.get('/:key', getSettingByKey);

// ==========================================
// PUT Routes
// ==========================================
// Update all settings (general, notifications, security, system)
router.put('/', updateSettings);

// Update specific setting by key
router.put('/:key', updateSettingByKey);

// ==========================================
// POST Routes
// ==========================================
// Reset all settings to default
router.post('/reset', resetSettings);

module.exports = router;