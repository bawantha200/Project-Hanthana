const { vendorOrderService } = require('../services/vendorOrderService');

const vendorOrderController = {
  // Get all vendor orders with filters
  async getVendorOrders(req, res) {
    try {
      const { vendorId, productId, status, search } = req.query;
      const filters = {};
      
      if (vendorId) filters.vendorId = parseInt(vendorId);
      if (productId) filters.productId = parseInt(productId);
      if (status) filters.status = status;
      if (search) filters.search = search;
      
      const orders = await vendorOrderService.getAllVendorOrders(filters);
      res.status(200).json({ success: true, orders });
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get single vendor order
  async getVendorOrder(req, res) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        return res.status(400).json({ success: false, error: 'Invalid order ID' });
      }
      const order = await vendorOrderService.getVendorOrderById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      res.status(200).json({ success: true, order });
    } catch (error) {
      console.error('Error fetching vendor order:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Create new vendor order
  async createVendorOrder(req, res) {
    try {
      const orderData = req.body;
      
      // Validate required fields
      if (!orderData.vendor_id || !orderData.product_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Vendor and product are required' 
        });
      }
      
      if (!orderData.quantity || orderData.quantity <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Quantity must be greater than 0' 
        });
      }
      
      if (orderData.unit_price === undefined || orderData.unit_price === null || orderData.unit_price < 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Unit price must be valid' 
        });
      }
      
      const newOrder = await vendorOrderService.createVendorOrder(orderData);
      res.status(201).json({ success: true, order: newOrder });
    } catch (error) {
      console.error('Error creating vendor order:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Update vendor order
  async updateVendorOrder(req, res) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        return res.status(400).json({ success: false, error: 'Invalid order ID' });
      }
      
      const orderData = req.body;
      const updatedOrder = await vendorOrderService.updateVendorOrder(orderId, orderData);
      if (!updatedOrder) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      
      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error('Error updating vendor order:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Update order status
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        return res.status(400).json({ success: false, error: 'Invalid order ID' });
      }
      
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      
      const updatedOrder = await vendorOrderService.updateOrderStatus(orderId, status);
      if (!updatedOrder) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      
      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Delete vendor order
  async deleteVendorOrder(req, res) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        return res.status(400).json({ success: false, error: 'Invalid order ID' });
      }
      
      await vendorOrderService.deleteVendorOrder(orderId);
      res.status(200).json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Error deleting vendor order:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get vendor purchase summary
  async getVendorPurchaseSummary(req, res) {
    try {
      const summary = await vendorOrderService.getVendorPurchaseSummary();
      res.status(200).json({ success: true, summary });
    } catch (error) {
      console.error('Error fetching vendor purchase summary:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

// Also export individual functions for route files that use destructuring
module.exports = vendorOrderController;