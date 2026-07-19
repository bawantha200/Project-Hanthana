const express = require('express');
const router = express.Router();

const {
  getSettings,
  getSettingByKey,
  updateSettings,
  updateSettingByKey,
  resetSettings,
  getPublicSettings,
  
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middlewares/authMiddleware'); // authorize - role check middleware eka thiyenawada balanna

// ==========================================
// Public route - NO auth required (කලින්ම දාන්න ඕන!)
// ==========================================
router.get('/public', getPublicSettings);

// ==========================================
// All routes below require authentication
// ==========================================
router.use(protect);

// ==========================================
// Security settings - admin/manager ට විතරයි (specific routes කලින් දාන්න ඕන
// නැත්නම් /:key eka match වෙලා පහළ ඉන්න route eka blockවෙනවා)
// ==========================================


// GET Routes
router.get('/', getSettings);
router.get('/:key', getSettingByKey);

// PUT Routes
router.put('/', updateSettings);
router.put('/:key', updateSettingByKey);

// POST Routes
router.post('/reset', resetSettings);

module.exports = router;