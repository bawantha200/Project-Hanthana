// backend/src/routes/maintenanceRoutes.js
const express = require('express');
const router = express.Router();
const { postMaintenanceWindow, getMaintenanceWindows, toggleMaintenanceMode } = require('../controllers/maintenanceController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', postMaintenanceWindow);
router.get('/', getMaintenanceWindows);
router.put('/mode', toggleMaintenanceMode);

module.exports = router;