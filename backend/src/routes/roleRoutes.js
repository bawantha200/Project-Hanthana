const express = require('express');
const router = express.Router();
const { getRoles } = require('../controllers/roleController');
const { protect } = require('../middlewares/authMiddleware');

// ✅ All routes require authentication
router.get('/', protect, getRoles);

module.exports = router;