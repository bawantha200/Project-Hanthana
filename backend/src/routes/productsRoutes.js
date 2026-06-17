const express = require('express');
const router = express.Router();
const productController = require('../controllers/productsController');
const upload = require('../middlewares/upload');

// All routes are prefixed with /api/products
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', upload.single('image'), productController.createProduct);
router.put('/:id', upload.single('image'), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;