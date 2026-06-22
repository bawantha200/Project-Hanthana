const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect } = require('../middlewares/authMiddleware'); // your protect middleware

// All routes require authentication
router.use(protect);

// You can add an admin middleware here if needed:
// const { admin } = require('../middlewares/roleMiddleware');
// router.use(admin); // if only admins can manage employees

router.get('/', employeeController.getAllEmployees);
router.get('/stats', employeeController.getEmployeeStats);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', employeeController.createEmployee);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);
router.patch('/:id/status', employeeController.updateEmployeeStatus); // optional

module.exports = router;