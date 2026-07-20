// routes/reportRoutes.js
const express = require('express');
const { reportController } = require('../controllers/reportController');

const router = express.Router();

router.get('/expense-summary', reportController.getExpenseSummary);

module.exports = router;