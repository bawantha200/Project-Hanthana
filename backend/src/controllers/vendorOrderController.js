// backend/src/controllers/vendorOrderController.js
const { vendorOrderService } = require('../services/vendorOrderService');

const vendorOrderController = {
  /**
   * GET /vendor-orders
   * Get all vendor orders with filters
   */
  async getVendorOrders(req, res) {
    try {
      const { vendorId, productId, status, search, dateFrom, dateTo } = req.query;
      const filters = {};
      
      if (vendorId) filters.vendorId = parseInt(vendorId);
      if (productId) filters.productId = parseInt(productId);
      if (status) filters.status = status;
      if (search) filters.search = search;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      
      const orders = await vendorOrderService.getAllVendorOrders(filters);
      res.status(200).json({ success: true, orders });
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /vendor-orders/summary
   * Get vendor purchase summary for charts
   */
  async getVendorPurchaseSummary(req, res) {
    try {
      const summary = await vendorOrderService.getVendorPurchaseSummary();
      res.status(200).json({ success: true, summary });
    } catch (error) {
      console.error('Error fetching vendor purchase summary:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /vendor-orders/:id
   * Get single vendor order
   */
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

  /**
   * POST /vendor-orders
   * Create new vendor order
   */
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
      
      // Validate order_type
      if (orderData.order_type && !['bottle', 'other'].includes(orderData.order_type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Order type must be "bottle" or "other"' 
        });
      }
      
      const newOrder = await vendorOrderService.createVendorOrder(orderData);
      res.status(201).json({ success: true, order: newOrder });
    } catch (error) {
      console.error('Error creating vendor order:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * PUT /vendor-orders/:id
   * Update vendor order
   */
  async updateVendorOrder(req, res) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        return res.status(400).json({ success: false, error: 'Invalid order ID' });
      }
      
      const orderData = req.body;
      
      // Validate order_type if provided
      if (orderData.order_type && !['bottle', 'other'].includes(orderData.order_type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Order type must be "bottle" or "other"' 
        });
      }
      
      // Validate quantity if provided
      if (orderData.quantity !== undefined && orderData.quantity <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Quantity must be greater than 0' 
        });
      }
      
      // Validate unit_price if provided
      if (orderData.unit_price !== undefined && orderData.unit_price < 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Unit price cannot be negative' 
        });
      }
      
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

  /**
   * PATCH /vendor-orders/:id/status
   * Update order status
   */
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
      
      // Validate status
      const validStatuses = ['pending', 'ordered', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
        });
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

  /**
   * DELETE /vendor-orders/:id
   * Delete vendor order
   */
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
  }
};

module.exports = vendorOrderController;