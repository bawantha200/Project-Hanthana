const  supabase  = require('../config/db');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

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
    console.log('[Products] Fetching all products...');
    
    // ✅ Get all products - no is_active filter
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Products] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

    console.log(`[Products] Found ${data?.length || 0} products`);
    return res.status(200).json({
      success: true,
      data: data || []
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

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[Products] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

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
    console.log('[Products] Creating product...');
    const { name, type, unit_price} = req.body;

    // Validation
    if (!name || !type || unit_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and unit_price are required'
      });
    }

    // Upload image if exists
    let image_url = null;
    if (req.file) {
      image_url = await uploadImage(req.file);
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        type: type.toUpperCase(),
        unit_price: parseFloat(unit_price),
       
        image_url: image_url || null
      })
      .select()
      .single();

    if (error) {
      console.error('[Products] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

    console.log('[Products] Created:', data.id);
    return res.status(201).json({
      success: true,
      data
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
    console.log(`[Products] Updating product: ${id}`);
    const { name, type, unit_price } = req.body;

    // Validation
    if (!name || !type || unit_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and unit_price are required'
      });
    }

    // Upload new image if exists
    let image_url = null;
    if (req.file) {
      image_url = await uploadImage(req.file);
    }

    // Build update object - only include fields that exist in table
    const updateData = {
      name,
      type: type.toUpperCase(),
      unit_price: parseFloat(unit_price)
    };


    if (image_url) updateData.image_url = image_url;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Products] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('[Products] Updated:', id);
    return res.status(200).json({
      success: true,
      data
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
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Products] Deleting product: ${id}`);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Products] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

    console.log('[Products] Deleted:', id);
    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('[Products] Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product'
    });
  }
};