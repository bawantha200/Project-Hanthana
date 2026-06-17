const productService = require('../services/productsService');
const supabase = require('../config/db');
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

exports.getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(parseInt(req.params.id));
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, type, unit_price } = req.body;
    if (!name || !type || unit_price === undefined) {
      return res.status(400).json({ error: 'Name, type, and unit_price are required' });
    }

    let image_url = null;
    if (req.file) {
      image_url = await uploadImage(req.file);
    }

    const product = await productService.createProduct({
      name,
      type,
      unit_price: parseFloat(unit_price),
      image_url,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, unit_price } = req.body;
    if (!name || !type || unit_price === undefined) {
      return res.status(400).json({ error: 'Name, type, and unit_price are required' });
    }

    let image_url = req.body.image_url || null; // allow updating without file upload
    if (req.file) {
      image_url = await uploadImage(req.file);
    }

    const product = await productService.updateProduct(parseInt(id), {
      name,
      type,
      unit_price: parseFloat(unit_price),
      image_url,
    });

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message || 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};