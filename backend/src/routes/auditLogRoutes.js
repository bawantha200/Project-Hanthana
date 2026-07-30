const express = require('express');
const router = express.Router();

const {
  getAuditLogs,
  getAuditLogActions,
} = require('../controllers/auditLogController');

const { protect } = require('../middlewares/authMiddleware');

// ===== All routes require authentication =====
router.use(protect);

router.get('/', getAuditLogs);
router.get('/actions', getAuditLogActions);

module.exports = router;