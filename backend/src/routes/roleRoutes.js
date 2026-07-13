const express = require('express');
const router = express.Router();
const { getRoles,createRole } = require('../controllers/roleController');
const { protect } = require('../middlewares/authMiddleware');

// ✅ All routes require authentication
router.get('/', protect, getRoles);
router.post('/', createRole);

module.exports = router;