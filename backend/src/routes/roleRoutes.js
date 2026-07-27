const express = require('express');
const router = express.Router();
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleController');
const { protect } = require('../middlewares/authMiddleware');

// ✅ All routes require authentication
router.get('/', protect, getRoles);
router.post('/', protect, createRole); // ⚠️ added `protect` — this was missing before
router.put('/:id', protect, updateRole);
router.delete('/:id', protect, deleteRole);

module.exports = router;