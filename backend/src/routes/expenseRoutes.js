// routes/expenseRoutes.js
const express = require('express');
const { expenseController } = require('../controllers/expenseController');

const router = express.Router();

router.get('/', expenseController.getExpenses);
router.get('/:id', expenseController.getExpense);
router.post('/', expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.patch('/:id/void', expenseController.voidExpense);

module.exports = router;