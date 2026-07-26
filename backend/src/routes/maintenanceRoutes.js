const express = require('express');
const router = express.Router();
const {
  postMaintenanceWindow,
  getMaintenanceWindows,
  toggleMaintenanceMode,
  getMaintenanceStatus,
  deleteMaintenanceWindow,
  updateMaintenanceWindow,
} = require('../controllers/maintenanceController');
const { protect } = require('../middlewares/authMiddleware');

// ✅ Public routes — MEKA router.use(protect) ekata ISSELLĀ thiyanna one
router.get('/mode', getMaintenanceStatus);
router.get('/', getMaintenanceWindows);

router.use(protect); // ✅ Meken PASSE thiyena okkoma routes protected

router.post('/', postMaintenanceWindow);
router.put('/:id', updateMaintenanceWindow);
router.put('/mode', toggleMaintenanceMode);
router.delete('/:id', deleteMaintenanceWindow);

module.exports = router;