const productService = require('../services/productsService');
const supabase = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Helper to upload image to Supabase Storage
async function uploadImage(file) {
  if (!file) return null;
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const bucket = process.env.SUPABASE_BUCKET || 'product-images';

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file.buffer, { contentType: file.mimetype });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return urlData.publicUrl;
}

/**
 * @desc    Get all products
 * @route   GET /api/products
 */
exports.getAllProducts = async (req, res) => {
  try {
    // Check if requester wants active-only (e.g., POS or mobile client)
    const includeInactive = req.query.includeInactive !== 'false';
    const data = await productService.getAllProducts(includeInactive);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[Products] Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await productService.getProductById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[Products] Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * @desc    Create product
 * @route   POST /api/products
 */
exports.createProduct = async (req, res) => {
  try {
    const { name, type, unit_price, is_active } = req.body;

    if (!name || !type || unit_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and unit_price are required'
      });
    }

    let image_url = null;
    if (req.file) {
      image_url = await uploadImage(req.file);
    }

    const newProduct = await productService.createProduct({
      name,
      type: type.toUpperCase(),
      unit_price: parseFloat(unit_price),
      is_active: is_active !== undefined ? String(is_active) === 'true' : true,
      image_url: image_url || null
    });

    return res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    console.error('[Products] Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create product'
    });
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, unit_price, is_active } = req.body;

    if (!name || !type || unit_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and unit_price are required'
      });
    }

    let image_url = null;
    if (req.file) {
      image_url = await uploadImage(req.file);
    }

    const updateData = {
      name,
      type: type.toUpperCase(),
      unit_price: parseFloat(unit_price)
    };

    if (is_active !== undefined) {
      updateData.is_active = String(is_active) === 'true';
    }

    if (image_url) updateData.image_url = image_url;

    const updatedProduct = await productService.updateProduct(id, updateData);

    return res.status(200).json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error('[Products] Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product'
    });
  }
};

/**
 * @desc    Deactivate / Delete product
 * @route   DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);

    return res.status(200).json({
      success: true,
      message: 'Product deactivated successfully'
    });
  } catch (error) {
    console.error('[Products] Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product'
    });
  }
};