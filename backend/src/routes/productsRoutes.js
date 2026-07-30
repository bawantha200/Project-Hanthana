const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productsController');
const { protect } = require('../middlewares/authMiddleware');

// Public or protected based on your needs
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected routes (Admin operations)
router.use(protect);
router.post('/', upload.single('image'), createProduct);
router.put('/:id', upload.single('image'), updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;