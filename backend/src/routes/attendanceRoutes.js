const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// GET all attendance records
router.get('/', attendanceController.getAllAttendance);

// GET attendance statistics
router.get('/stats', attendanceController.getAttendanceStats);

// GET attendance by employee
router.get('/employee/:employeeId', attendanceController.getAttendanceByEmployee);

// CREATE attendance record
router.post('/', attendanceController.createAttendance);

// UPDATE attendance record
router.put('/:id', attendanceController.updateAttendance);

// DELETE attendance record
router.delete('/:id', attendanceController.deleteAttendance);

module.exports = router;