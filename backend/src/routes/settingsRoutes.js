const express = require('express');
const router = express.Router();

const {
  getSettings,
  getSettingByKey,
  updateSettings,
  updateSettingByKey,
  resetSettings,
  getPublicSettings
} = require('../controllers/settingsController');
const { protect } = require('../middlewares/authMiddleware');

// ==========================================
// Public route - NO auth required (කලින්ම දාන්න ඕන!)
// ==========================================
router.get('/public', getPublicSettings);

// ==========================================
// All routes below require authentication
// ==========================================
router.use(protect);

// GET Routes
router.get('/', getSettings);
router.get('/:key', getSettingByKey);

// PUT Routes
router.put('/', updateSettings);
router.put('/:key', updateSettingByKey);

// POST Routes
router.post('/reset', resetSettings);

module.exports = router;