const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

// GET all salary records
router.get('/', salaryController.getAllSalaries);

// GET salary summary
router.get('/summary', salaryController.getSalarySummary);

// GET salary by employee
router.get('/employee/:employeeId', salaryController.getSalaryByEmployee);

// CREATE salary record
router.post('/', salaryController.createSalary);

// UPDATE salary record
router.put('/:id', salaryController.updateSalary);

// Mark salary as paid
router.patch('/:id/pay', salaryController.markAsPaid);

// DELETE salary record
router.delete('/:id', salaryController.deleteSalary);

module.exports = router;