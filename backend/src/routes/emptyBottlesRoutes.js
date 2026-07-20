// backend/src/routes/emptyBottlesRoutes.js
const express = require('express');
const router = express.Router();
const emptyBottlesController = require('../controllers/emptyBottlesController');

// GET routes
router.get('/stock', emptyBottlesController.getCurrentStock);
router.get('/returns', emptyBottlesController.getReturns);
router.get('/daily-aggregate', emptyBottlesController.getDailyAggregate);
router.get('/with-deliveries', emptyBottlesController.getReturnsWithDeliveryInfo);
router.get('/deliveries', emptyBottlesController.getCompletedDeliveries);

// POST routes
router.post('/record-from-delivery', emptyBottlesController.recordFromDelivery);
router.post('/record-manual', emptyBottlesController.recordManual);
router.post('/use', emptyBottlesController.useBottles);

// DELETE routes
router.delete('/:id', emptyBottlesController.deleteReturn);

module.exports = router;