// backend/src/controllers/stockController.js
const stockService = require('../services/stockService');

const stockController = {
  async getProducts(req, res) {
    try {
      const products = await stockService.getProductsWithStock();
      res.status(200).json({ success: true, products });
    } catch (error) {
      console.error('getProducts error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
  },

  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await stockService.getProductById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.status(200).json({ success: true, product });
    } catch (error) {
      console.error('getProductById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch product' });
    }
  },

  async addStock(req, res) {
    try {
      const { product_id, quantity, reason, notes } = req.body;

      if (product_id === undefined || product_id === null) {
        return res.status(400).json({ success: false, message: 'product_id is required' });
      }
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'quantity must be a positive whole number' });
      }

      const result = await stockService.addStock(
        Number(product_id),
        qty,
        reason,
        notes
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('addStock controller error:', error.message);

      const expectedErrorPatterns = [
        'Insufficient empty bottles',
        'Insufficient stock',
        'Product not found',
        'No matching empty/refill product found',
        'Quantity must be'
      ];
      const isExpected = expectedErrorPatterns.some(pattern =>
        error.message?.includes(pattern)
      );

      return res.status(isExpected ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to add stock'
      });
    }
  },

  async getStock(req, res) {
    try {
      const { id } = req.params;
      const stock = await stockService.getCurrentStock(Number(id));
      return res.status(200).json({ success: true, stock });
    } catch (error) {
      console.error('getStock controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch stock' });
    }
  },

  async processVendorOrder(req, res) {
    try {
      const { orderId } = req.params;
      const result = await stockService.processVendorOrder(Number(orderId));
      return res.status(200).json(result);
    } catch (error) {
      console.error('processVendorOrder controller error:', error.message);
      const isExpected = error.message?.includes('Insufficient') ||
                          error.message?.includes('not found') ||
                          error.message?.includes('No matching');
      return res.status(isExpected ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to process vendor order'
      });
    }
  },

  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason, notes } = req.body;

      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 0) {
        return res.status(400).json({ success: false, message: 'quantity must be a whole number >= 0' });
      }

      const result = await stockService.updateStock(Number(id), qty, reason, notes);
      return res.status(200).json(result);
    } catch (error) {
      console.error('updateStock controller error:', error.message);
      const isExpected = error.message?.includes('Insufficient') || error.message?.includes('not found');
      return res.status(isExpected ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to update stock'
      });
    }
  },

  async reduceStock(req, res) {
    try {
      const { product_id, quantity, reason, notes } = req.body;
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'quantity must be a positive whole number' });
      }

      const result = await stockService.reduceStock(Number(product_id), qty, reason, notes);
      return res.status(200).json(result);
    } catch (error) {
      console.error('reduceStock controller error:', error.message);
      const isExpected = error.message?.includes('Insufficient') || error.message?.includes('not found');
      return res.status(isExpected ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to reduce stock'
      });
    }
  },

  async deleteStock(req, res) {
    try {
      const { id } = req.params;
      const result = await stockService.deleteStock(Number(id));
      return res.status(200).json(result);
    } catch (error) {
      console.error('deleteStock controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to delete stock' });
    }
  },

  async getTransactions(req, res) {
    try {
      const { product_id, limit } = req.query;
      const transactions = await stockService.getTransactionHistory(
        product_id ? Number(product_id) : null,
        limit ? Number(limit) : 50
      );
      return res.status(200).json({ success: true, transactions });
    } catch (error) {
      console.error('getTransactions controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
    }
  },

  async getStockSummary(req, res) {
    try {
      const summary = await stockService.getStockSummary();
      return res.status(200).json({ success: true, summary });
    } catch (error) {
      console.error('getStockSummary controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch stock summary' });
    }
  },

  async syncEmptyStock(req, res) {
    try {
      const results = await stockService.syncEmptyBottleStock();
      return res.status(200).json({ success: true, results });
    } catch (error) {
      console.error('syncEmptyStock controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to sync empty stock' });
    }
  },

  async convertStock(req, res) {
    try {
      const { product_id, quantity, conversion_direction, reason, notes } = req.body;

      if (product_id === undefined || product_id === null) {
        return res.status(400).json({ success: false, message: 'product_id is required' });
      }

      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'quantity must be a positive whole number' });
      }

      if (!['empty_to_stock', 'stock_to_empty'].includes(conversion_direction)) {
        return res.status(400).json({ 
          success: false, 
          message: 'conversion_direction must be "empty_to_stock" or "stock_to_empty"' 
        });
      }

      const result = await stockService.convertStock(
        Number(product_id),
        qty,
        conversion_direction,
        reason || 'correction',
        notes || ''
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('convertStock controller error:', error.message);
      
      const expectedErrorPatterns = [
        'Insufficient empty bottles',
        'Insufficient sealed stock',
        'Product not found',
        'Invalid conversion direction',
        'Quantity must be a positive whole number'
      ];
      const isExpected = expectedErrorPatterns.some(pattern =>
        error.message?.includes(pattern)
      );

      return res.status(isExpected ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to convert stock'
      });
    }
  }
};

module.exports = stockController;