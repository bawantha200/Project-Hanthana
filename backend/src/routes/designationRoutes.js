// backend/src/routes/designationRoutes.js
const express = require('express');
const router = express.Router();
const designationController = require('../controllers/designationController');

// GET all designations
router.get('/', designationController.getAllDesignations);

// GET designation statistics
router.get('/stats', designationController.getDesignationStats);

// GET designations with employee counts
router.get('/with-count', designationController.getDesignationsWithEmployeeCount);

// GET a single designation by ID
router.get('/:id', designationController.getDesignationById);

// POST create a new designation
router.post('/', designationController.createDesignation);

// PUT update a designation
router.put('/:id', designationController.updateDesignation);

// DELETE a designation
router.delete('/:id', designationController.deleteDesignation);

module.exports = router;