// backend/src/routes/emptyBottlesRoutes.js
const express = require('express');
const router = express.Router();
const emptyBottlesController = require('../controllers/emptyBottlesController');

router.get('/stock', emptyBottlesController.getStock);
router.get('/returns', emptyBottlesController.getReturns);
router.get('/daily-aggregate', emptyBottlesController.getDailyAggregate);
router.get('/with-deliveries', emptyBottlesController.getWithDeliveries);
router.get('/deliveries', emptyBottlesController.getCompletedDeliveries);

router.post('/record-from-delivery', emptyBottlesController.recordFromDelivery);
router.post('/use', emptyBottlesController.useBottles);

router.delete('/:id', emptyBottlesController.deleteReturn);

module.exports = router;