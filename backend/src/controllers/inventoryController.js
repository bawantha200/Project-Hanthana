const inventoryService = require('../services/inventoryService');

exports.getInventoryStock = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    const stock = await inventoryService.getCurrentStock(Number(productId));
    res.json({ product_id: productId, current_stock: stock });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateDailyProductionStock = async (req, res) => {
  try {
    const { product_id, added_quantity, planned_date } = req.body;
    if (!product_id || added_quantity === undefined || !planned_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (added_quantity <= 0) {
      return res.status(400).json({ error: 'added_quantity must be positive' });
    }
    const updatedStock = await inventoryService.updateStockAndPlan(
      Number(product_id),
      Number(added_quantity),
      planned_date
    );
    res.json({
      success: true,
      message: `Stock updated successfully. New stock: ${updatedStock}`,
      updated_stock: updatedStock
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getProductsWithStock = async (req, res) => {
  try {
    const products = await inventoryService.getProductsWithStock();
    res.json({ products });
  } catch (err) {
    console.error('Error in getProductsWithStock:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendors = await inventoryService.getVendors();
    res.json({ vendors });
  } catch (err) {
    console.error('Error in getVendors:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getEmptyBottles = async (req, res) => {
  try {
    const emptyBottles = await inventoryService.getEmptyBottles();
    res.json({ emptyBottles });
  } catch (err) {
    console.error('Error in getEmptyBottles:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlySales = async (req, res) => {
  try {
    const monthlySales = await inventoryService.getMonthlySales();
    res.json({ monthlySales });
  } catch (err) {
    console.error('Error in getMonthlySales:', err);
    res.status(500).json({ error: err.message });
  }
};