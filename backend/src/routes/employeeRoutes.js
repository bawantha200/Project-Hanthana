const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// GET all employees
router.get('/', employeeController.getAllEmployees);

// GET employee statistics
router.get('/stats', employeeController.getEmployeeStats);

// GET a single employee
router.get('/:id', employeeController.getEmployeeById);

// CREATE a new employee
router.post('/', employeeController.createEmployee);

// UPDATE an employee
router.put('/:id', employeeController.updateEmployee);

// DELETE an employee
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;