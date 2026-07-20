// backend/src/controllers/emptyBottlesController.js
const { emptyBottlesService } = require('../services/emptyBottlesService');

// Get current stock
const getCurrentStock = async (req, res) => {
  try {
    const stock = await emptyBottlesService.getCurrentStock();
    res.json({ success: true, emptyBottles: stock });
  } catch (error) {
    console.error('Error in getCurrentStock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all returns
const getReturns = async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (productId) filters.productId = parseInt(productId);

    const returns = await emptyBottlesService.getAllReturns(filters);
    res.json({ success: true, returns });
  } catch (error) {
    console.error('Error in getReturns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Record return from delivery
const recordFromDelivery = async (req, res) => {
  try {
    const { delivery_id, quantity, notes } = req.body;

    if (!delivery_id) {
      return res.status(400).json({ success: false, error: 'Delivery ID is required' });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Valid quantity is required' });
    }

    const result = await emptyBottlesService.recordFromDelivery(
      parseInt(delivery_id),
      parseInt(quantity),
      notes
    );

    res.status(201).json({ success: true, return: result });
  } catch (error) {
    console.error('Error in recordFromDelivery:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Record manual return
const recordManual = async (req, res) => {
  try {
    const { quantity, return_date, notes } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Valid quantity is required' });
    }

    const result = await emptyBottlesService.recordManual(
      parseInt(quantity),
      return_date,
      notes
    );

    res.status(201).json({ success: true, return: result });
  } catch (error) {
    console.error('Error in recordManual:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Use bottles (reduce stock)
const useBottles = async (req, res) => {
  try {
    const { quantity, reason, notes } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Valid quantity is required' });
    }

    const result = await emptyBottlesService.useBottles(
      parseInt(quantity),
      reason,
      notes
    );

    res.status(201).json({ success: true, return: result });
  } catch (error) {
    console.error('Error in useBottles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get daily aggregate
const getDailyAggregate = async (req, res) => {
  try {
    const { days } = req.query;
    const daysCount = days ? parseInt(days) : 30;
    const aggregate = await emptyBottlesService.getDailyAggregate(daysCount);
    res.json({ success: true, aggregate });
  } catch (error) {
    console.error('Error in getDailyAggregate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get returns with delivery info
const getReturnsWithDeliveryInfo = async (req, res) => {
  try {
    const returns = await emptyBottlesService.getReturnsWithDeliveryInfo();
    res.json({ success: true, returns });
  } catch (error) {
    console.error('Error in getReturnsWithDeliveryInfo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get completed deliveries
const getCompletedDeliveries = async (req, res) => {
  try {
    const deliveries = await emptyBottlesService.getCompletedDeliveries();
    res.json({ success: true, deliveries });
  } catch (error) {
    console.error('Error in getCompletedDeliveries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete return
const deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;
    await emptyBottlesService.deleteReturn(parseInt(id));
    res.json({ success: true, message: 'Return record deleted successfully' });
  } catch (error) {
    console.error('Error in deleteReturn:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export all functions
module.exports = {
  getCurrentStock,
  getReturns,
  recordFromDelivery,
  recordManual,
  useBottles,
  getDailyAggregate,
  getReturnsWithDeliveryInfo,
  getCompletedDeliveries,
  deleteReturn
};