const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// GET all employees
router.get('/', employeeController.getAllEmployees);

router.get('/roles', employeeController.getAllRoles);

// ✅ GET pending employees
router.get('/pending', employeeController.getPendingEmployees);

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

// UPDATE employee status
router.patch('/:id/status', employeeController.updateEmployeeStatus);

module.exports = router;
