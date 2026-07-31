// backend/src/controllers/stockController.js
const stockService = require('../services/stockService');
const cache = require('../config/cache');

// Cache configuration
const CACHE_TTL = {
  PRODUCTS_LIST: 120,         // 2 minutes for products list
  SINGLE_PRODUCT: 120,        // 2 minutes for single product
  CURRENT_STOCK: 60,          // 60 seconds for current stock
  STOCK_SUMMARY: 120,         // 2 minutes for stock summary
  TRANSACTIONS: 60,           // 60 seconds for transactions
  EMPTY_STOCK_SYNC: 300,      // 5 minutes for empty stock sync results
};

const CACHE_KEYS = {
  PRODUCTS: 'stock_products',
  PRODUCT_PREFIX: 'stock_product_',
  STOCK_PREFIX: 'stock_',
  STOCK_SUMMARY: 'stock_summary',
  TRANSACTIONS: 'stock_transactions',
  EMPTY_STOCK: 'empty_stock_sync',
};

// Helper to invalidate stock caches
const invalidateStockCaches = (productId = null) => {
  // Delete products list cache
  cache.del(CACHE_KEYS.PRODUCTS);
  cache.del(CACHE_KEYS.STOCK_SUMMARY);
  cache.del(CACHE_KEYS.EMPTY_STOCK);
  
  // Delete specific product cache if provided
  if (productId) {
    cache.del(`${CACHE_KEYS.PRODUCT_PREFIX}${productId}`);
    cache.del(`${CACHE_KEYS.STOCK_PREFIX}${productId}`);
  }
};

const stockController = {
  // ──────────────────────────────────────────────
  // GET PRODUCTS
  // ──────────────────────────────────────────────
  async getProducts(req, res) {
    try {
      // Check cache
      const cachedProducts = cache.get(CACHE_KEYS.PRODUCTS);
      if (cachedProducts) {
        console.log('[getProducts] Returning cached products');
        return res.status(200).json({ 
          success: true, 
          products: cachedProducts,
          fromCache: true 
        });
      }

      const products = await stockService.getProductsWithStock();
      
      // Store in cache
      cache.set(CACHE_KEYS.PRODUCTS, products, CACHE_TTL.PRODUCTS_LIST);
      console.log('[getProducts] Products cached');

      res.status(200).json({ success: true, products });
    } catch (error) {
      console.error('getProducts error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
  },

  // ──────────────────────────────────────────────
  // GET PRODUCT BY ID
  // ──────────────────────────────────────────────
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      // Check cache
      const cacheKey = `${CACHE_KEYS.PRODUCT_PREFIX}${id}`;
      const cachedProduct = cache.get(cacheKey);
      if (cachedProduct) {
        console.log(`[getProductById] Returning cached product: ${id}`);
        return res.status(200).json({ 
          success: true, 
          product: cachedProduct,
          fromCache: true 
        });
      }

      const product = await stockService.getProductById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      
      // Store in cache
      cache.set(cacheKey, product, CACHE_TTL.SINGLE_PRODUCT);

      res.status(200).json({ success: true, product });
    } catch (error) {
      console.error('getProductById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch product' });
    }
  },

  // ──────────────────────────────────────────────
  // ADD STOCK
  // ──────────────────────────────────────────────
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

      // Invalidate caches
      invalidateStockCaches(Number(product_id));

      return res.status(200).json({
        ...result,
        cacheInvalidated: true
      });
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

  // ──────────────────────────────────────────────
  // GET STOCK
  // ──────────────────────────────────────────────
  async getStock(req, res) {
    try {
      const { id } = req.params;
      const productId = Number(id);
      
      // Check cache
      const cacheKey = `${CACHE_KEYS.STOCK_PREFIX}${productId}`;
      const cachedStock = cache.get(cacheKey);
      if (cachedStock) {
        console.log(`[getStock] Returning cached stock for product: ${id}`);
        return res.status(200).json({ 
          success: true, 
          stock: cachedStock,
          fromCache: true 
        });
      }

      const stock = await stockService.getCurrentStock(productId);
      
      // Store in cache
      cache.set(cacheKey, stock, CACHE_TTL.CURRENT_STOCK);

      return res.status(200).json({ success: true, stock });
    } catch (error) {
      console.error('getStock controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch stock' });
    }
  },

  // ──────────────────────────────────────────────
  // PROCESS VENDOR ORDER
  // ──────────────────────────────────────────────
  async processVendorOrder(req, res) {
    try {
      const { orderId } = req.params;
      const result = await stockService.processVendorOrder(Number(orderId));
      
      // Invalidate caches
      invalidateStockCaches();
      
      return res.status(200).json({
        ...result,
        cacheInvalidated: true
      });
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

  // ──────────────────────────────────────────────
  // UPDATE STOCK
  // ──────────────────────────────────────────────
  async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason, notes } = req.body;

      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 0) {
        return res.status(400).json({ success: false, message: 'quantity must be a whole number >= 0' });
      }

      const result = await stockService.updateStock(Number(id), qty, reason, notes);
      
      // Invalidate caches
      invalidateStockCaches(Number(id));

      return res.status(200).json({
        ...result,
        cacheInvalidated: true
      });
    } catch (error) {
      console.error('updateStock controller error:', error.message);
      const isExpected = error.message?.includes('Insufficient') || error.message?.includes('not found');
      return res.status(isExpected ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to update stock'
      });
    }
  },

  // ──────────────────────────────────────────────
  // REDUCE STOCK
  // ──────────────────────────────────────────────
  async reduceStock(req, res) {
    try {
      const { product_id, quantity, reason, notes } = req.body;
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'quantity must be a positive whole number' });
      }

      const result = await stockService.reduceStock(Number(product_id), qty, reason, notes);
      
      // Invalidate caches
      invalidateStockCaches(Number(product_id));

      return res.status(200).json({
        ...result,
        cacheInvalidated: true
      });
    } catch (error) {
      console.error('reduceStock controller error:', error.message);
      const isExpected = error.message?.includes('Insufficient') || error.message?.includes('not found');
      return res.status(isExpected ? 400 : 500).json({
        success: false,
        message: error.message || 'Failed to reduce stock'
      });
    }
  },

  // ──────────────────────────────────────────────
  // DELETE STOCK
  // ──────────────────────────────────────────────
  async deleteStock(req, res) {
    try {
      const { id } = req.params;
      const result = await stockService.deleteStock(Number(id));
      
      // Invalidate caches
      invalidateStockCaches(Number(id));

      return res.status(200).json({
        ...result,
        cacheInvalidated: true
      });
    } catch (error) {
      console.error('deleteStock controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to delete stock' });
    }
  },

  // ──────────────────────────────────────────────
  // GET TRANSACTIONS
  // ──────────────────────────────────────────────
  async getTransactions(req, res) {
    try {
      const { product_id, limit } = req.query;
      
      // Build cache key
      const cacheKey = `${CACHE_KEYS.TRANSACTIONS}_${product_id || 'all'}_${limit || 50}`;
      
      // Check cache
      const cachedTransactions = cache.get(cacheKey);
      if (cachedTransactions) {
        console.log('[getTransactions] Returning cached transactions');
        return res.status(200).json({ 
          success: true, 
          transactions: cachedTransactions,
          fromCache: true 
        });
      }

      const transactions = await stockService.getTransactionHistory(
        product_id ? Number(product_id) : null,
        limit ? Number(limit) : 50
      );
      
      // Store in cache
      cache.set(cacheKey, transactions, CACHE_TTL.TRANSACTIONS);

      return res.status(200).json({ success: true, transactions });
    } catch (error) {
      console.error('getTransactions controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
    }
  },

  // ──────────────────────────────────────────────
  // GET STOCK SUMMARY
  // ──────────────────────────────────────────────
  async getStockSummary(req, res) {
    try {
      // Check cache
      const cachedSummary = cache.get(CACHE_KEYS.STOCK_SUMMARY);
      if (cachedSummary) {
        console.log('[getStockSummary] Returning cached summary');
        return res.status(200).json({ 
          success: true, 
          summary: cachedSummary,
          fromCache: true 
        });
      }

      const summary = await stockService.getStockSummary();
      
      // Store in cache
      cache.set(CACHE_KEYS.STOCK_SUMMARY, summary, CACHE_TTL.STOCK_SUMMARY);

      return res.status(200).json({ success: true, summary });
    } catch (error) {
      console.error('getStockSummary controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch stock summary' });
    }
  },

  // ──────────────────────────────────────────────
  // SYNC EMPTY STOCK
  // ──────────────────────────────────────────────
  async syncEmptyStock(req, res) {
    try {
      // Check cache
      const cachedResults = cache.get(CACHE_KEYS.EMPTY_STOCK);
      if (cachedResults) {
        console.log('[syncEmptyStock] Returning cached results');
        return res.status(200).json({ 
          success: true, 
          results: cachedResults,
          fromCache: true 
        });
      }

      const results = await stockService.syncEmptyBottleStock();
      
      // Store in cache
      cache.set(CACHE_KEYS.EMPTY_STOCK, results, CACHE_TTL.EMPTY_STOCK_SYNC);

      return res.status(200).json({ success: true, results });
    } catch (error) {
      console.error('syncEmptyStock controller error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to sync empty stock' });
    }
  },

  // ──────────────────────────────────────────────
  // CONVERT STOCK (Empty ↔ Sealed)
  // ──────────────────────────────────────────────
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

      // Invalidate caches
      invalidateStockCaches(Number(product_id));

      return res.status(200).json({
        ...result,
        cacheInvalidated: true
      });
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
  },

  // ──────────────────────────────────────────────
  // CLEAR STOCK CACHE (Admin Utility)
  // ──────────────────────────────────────────────
  async clearStockCache(req, res) {
    try {
      const { productId } = req.params;
      
      if (productId) {
        invalidateStockCaches(Number(productId));
        res.status(200).json({ 
          success: true, 
          message: `Stock cache cleared for product: ${productId}` 
        });
      } else {
        // Clear all stock-related caches
        const keys = cache.keys();
        let clearedCount = 0;
        
        const patterns = [
          CACHE_KEYS.PRODUCTS,
          CACHE_KEYS.STOCK_SUMMARY,
          CACHE_KEYS.EMPTY_STOCK,
          CACHE_KEYS.PRODUCT_PREFIX,
          CACHE_KEYS.STOCK_PREFIX,
          CACHE_KEYS.TRANSACTIONS
        ];
        
        for (const key of keys) {
          for (const pattern of patterns) {
            if (key.startsWith(pattern) || key === pattern) {
              cache.del(key);
              clearedCount++;
              break;
            }
          }
        }
        
        res.status(200).json({ 
          success: true, 
          message: `Cleared ${clearedCount} stock cache entries`,
          clearedCount 
        });
      }
    } catch (error) {
      console.error('clearStockCache error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to clear cache' });
    }
  },

  // ──────────────────────────────────────────────
  // GET CACHE STATS (Admin Utility)
  // ──────────────────────────────────────────────
  async getCacheStats(req, res) {
    try {
      const stats = cache.stats();
      const keys = cache.keys();
      
      const stockKeys = keys.filter(k => 
        k.startsWith(CACHE_KEYS.PRODUCT_PREFIX) ||
        k.startsWith(CACHE_KEYS.STOCK_PREFIX) ||
        k.startsWith(CACHE_KEYS.TRANSACTIONS)
      );
      
      res.status(200).json({
        success: true,
        cacheStats: stats,
        keyCounts: {
          total: keys.length,
          products: keys.includes(CACHE_KEYS.PRODUCTS) ? 1 : 0,
          stockSummary: keys.includes(CACHE_KEYS.STOCK_SUMMARY) ? 1 : 0,
          emptyStock: keys.includes(CACHE_KEYS.EMPTY_STOCK) ? 1 : 0,
          productDetails: keys.filter(k => k.startsWith(CACHE_KEYS.PRODUCT_PREFIX)).length,
          stockItems: keys.filter(k => k.startsWith(CACHE_KEYS.STOCK_PREFIX)).length,
          transactions: keys.filter(k => k.startsWith(CACHE_KEYS.TRANSACTIONS)).length,
        }
      });
    } catch (error) {
      console.error('getCacheStats error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to get cache stats' });
    }
  },

  // ──────────────────────────────────────────────
  // TOGGLE / UPDATE STOCK ACTIVE STATUS
  // ──────────────────────────────────────────────
  async toggleStockStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body; // Expecting boolean (true/false) from request body

      // Pass the new status to the service method
      const result = await stockService.updateStockStatus(Number(id), is_active);

      // Invalidate caches since the stock status changed
      invalidateStockCaches(Number(id));

      return res.status(200).json({
        ...result,
        cacheInvalidated: true
      });
    } catch (error) {
      console.error('toggleStockStatus controller error:', error.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update stock status' 
      });
    }
  },
};

module.exports = stockController;