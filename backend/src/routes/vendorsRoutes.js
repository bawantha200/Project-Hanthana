// routes/vendorsRoutes.js
const express = require('express');
const { vendorsController } = require('../controllers/vendorsController');

const router = express.Router();

router.get('/', vendorsController.getVendors);
router.get('/:id', vendorsController.getVendor);
router.post('/', vendorsController.createVendor);
router.put('/:id', vendorsController.updateVendor);
router.delete('/:id', vendorsController.deleteVendor);

module.exports = router;