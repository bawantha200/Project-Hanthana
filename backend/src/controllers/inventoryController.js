// backend/src/controllers/inventoryController.js
const inventoryService = require('../services/inventoryService');

// ============ VENDORS ============
exports.getVendors = async (req, res) => {
  try {
    const vendors = await inventoryService.getVendors();
    res.json({ vendors });
  } catch (error) {
    console.error('Error getting vendors:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ PRODUCT STOCK ENDPOINTS ============
exports.getProductsWithStock = async (req, res) => {
  try {
    const products = await inventoryService.getProductsWithStock();
    res.json({ products });
  } catch (err) {
    console.error('Error in getProductsWithStock:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await inventoryService.getProductById(Number(productId));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    console.error('Error in getProductById:', err);
    res.status(500).json({ error: err.message });
  }
};

// ============ INVENTORY STOCK ENDPOINTS ============
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

exports.addStock = async (req, res) => {
  try {
    const { product_id, quantity, reason, notes } = req.body;
    
    if (!product_id || quantity === undefined) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    
    const result = await inventoryService.addStock(
      Number(product_id),
      Number(quantity),
      reason || 'restock',
      notes || ''
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Stock added successfully',
      data: result 
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.reduceStock = async (req, res) => {
  try {
    const { product_id, quantity, reason, notes } = req.body;
    
    if (!product_id || quantity === undefined) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    
    const result = await inventoryService.reduceStock(
      Number(product_id),
      Number(quantity),
      reason || 'usage',
      notes || ''
    );
    
    res.json({ 
      success: true, 
      message: 'Stock reduced successfully',
      data: result 
    });
  } catch (error) {
    console.error('Reduce stock error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, reason, notes } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }
    
    if (quantity < 0) {
      return res.status(400).json({ error: 'Quantity cannot be negative' });
    }
    
    const result = await inventoryService.updateStock(
      Number(productId),
      Number(quantity),
      reason || 'adjustment',
      notes || ''
    );
    
    res.json({ 
      success: true, 
      message: 'Stock updated successfully',
      data: result 
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteStock = async (req, res) => {
  try {
    const { productId } = req.params;
    await inventoryService.deleteStock(Number(productId));
    res.status(204).send();
  } catch (error) {
    console.error('Delete stock error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ 19L EMPTY BOTTLE ENDPOINTS ============
exports.getEmptyBottles = async (req, res) => {
  try {
    const emptyBottles = await inventoryService.getEmptyBottles();
    res.json({ emptyBottles });
  } catch (err) {
    console.error('Error in getEmptyBottles:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.recordEmptyBottleReturn = async (req, res) => {
  try {
    const { product_id, quantity, return_date, notes } = req.body;
    
    if (!product_id || !quantity || !return_date) {
      return res.status(400).json({ 
        error: 'Product ID, quantity, and return date are required' 
      });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    
    const result = await inventoryService.recordEmptyBottleReturn(
      Number(product_id),
      Number(quantity),
      return_date,
      notes || ''
    );
    
    res.status(201).json({ 
      success: true, 
      message: '19L empty bottle return recorded successfully',
      data: result 
    });
  } catch (error) {
    console.error('Record empty bottle error:', error);
    if (error.message.includes('Only 19L bottles')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.useEmptyBottles = async (req, res) => {
  try {
    const { product_id, quantity, notes } = req.body;
    
    if (!product_id || !quantity) {
      return res.status(400).json({ 
        error: 'Product ID and quantity are required' 
      });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    
    const result = await inventoryService.useEmptyBottles(
      Number(product_id),
      Number(quantity),
      notes || ''
    );
    
    res.json({ 
      success: true, 
      message: 'Empty bottles used for filling',
      data: result 
    });
  } catch (error) {
    console.error('Use empty bottles error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getEmptyBottleReturnHistory = async (req, res) => {
  try {
    const history = await inventoryService.getEmptyBottleReturnHistory();
    res.json({ history });
  } catch (error) {
    console.error('Error getting empty bottle return history:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ VENDOR ORDER ENDPOINTS ============
exports.createVendorOrder = async (req, res) => {
  try {
    const { 
      vendor_id, 
      product_id, 
      order_type,
      quantity, 
      unit_price, 
      order_date, 
      delivery_date, 
      status, 
      notes 
    } = req.body;
    
    if (!vendor_id || !product_id || !quantity || !unit_price || !order_type) {
      return res.status(400).json({ 
        error: 'Vendor ID, product, order type, quantity, and unit price are required' 
      });
    }
    
    if (!['bottle', 'other'].includes(order_type)) {
      return res.status(400).json({ 
        error: 'Order type must be "bottle" or "other"' 
      });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    
    if (unit_price < 0) {
      return res.status(400).json({ error: 'Unit price cannot be negative' });
    }
    
    const total = Number(quantity) * Number(unit_price);
    
    const result = await inventoryService.createVendorOrder({
      vendor_id: Number(vendor_id),
      product_id: Number(product_id),
      order_type: order_type,
      quantity: Number(quantity),
      unit_price: Number(unit_price),
      total: total,
      order_date: order_date || new Date().toISOString().split('T')[0],
      delivery_date: delivery_date || null,
      status: status || 'pending',
      notes: notes || ''
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Vendor order created successfully',
      data: result 
    });
  } catch (error) {
    console.error('Create vendor order error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateVendorOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      vendor_id, 
      product_id, 
      order_type,
      quantity, 
      unit_price, 
      order_date, 
      delivery_date, 
      status, 
      notes 
    } = req.body;
    
    const updateData = {};
    if (vendor_id !== undefined) updateData.vendor_id = Number(vendor_id);
    if (product_id !== undefined) updateData.product_id = Number(product_id);
    if (order_type !== undefined) {
      if (!['bottle', 'other'].includes(order_type)) {
        return res.status(400).json({ error: 'Order type must be "bottle" or "other"' });
      }
      updateData.order_type = order_type;
    }
    if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
    }
    if (unit_price !== undefined) {
      updateData.unit_price = Number(unit_price);
    }
    if (quantity !== undefined && unit_price !== undefined) {
      updateData.total = Number(quantity) * Number(unit_price);
    } else if (quantity !== undefined && updateData.unit_price === undefined) {
      const currentOrder = await inventoryService.getVendorOrderById(Number(orderId));
      if (currentOrder) {
        updateData.total = Number(quantity) * Number(currentOrder.unit_price);
      }
    } else if (unit_price !== undefined && updateData.quantity === undefined) {
      const currentOrder = await inventoryService.getVendorOrderById(Number(orderId));
      if (currentOrder) {
        updateData.total = Number(currentOrder.quantity) * Number(unit_price);
      }
    }
    if (order_date !== undefined) updateData.order_date = order_date;
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    const result = await inventoryService.updateVendorOrder(
      Number(orderId),
      updateData
    );
    
    res.json({ 
      success: true, 
      message: 'Vendor order updated successfully',
      data: result 
    });
  } catch (error) {
    console.error('Update vendor order error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getVendorOrders = async (req, res) => {
  try {
    const { vendor_id } = req.query;
    const orders = await inventoryService.getVendorOrders(
      vendor_id ? Number(vendor_id) : null
    );
    res.json({ orders });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ ANALYTICS ENDPOINTS ============
exports.getMonthlySales = async (req, res) => {
  try {
    const monthlySales = await inventoryService.getMonthlySales();
    res.json({ monthlySales });
  } catch (err) {
    console.error('Error in getMonthlySales:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getVendorPurchaseSummary = async (req, res) => {
  try {
    const summary = await inventoryService.getVendorPurchaseSummary();
    res.json({ summary });
  } catch (error) {
    console.error('Error getting vendor purchase summary:', error);
    res.status(500).json({ error: error.message });
  }
};