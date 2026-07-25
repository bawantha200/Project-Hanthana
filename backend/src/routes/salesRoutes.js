
const express = require('express');
const router = express.Router();
const { getSalesManagerDashboard } = require('../controllers/salesController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/dashboard', getSalesManagerDashboard);

module.exports = router;