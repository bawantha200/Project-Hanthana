// backend/src/controllers/analyticsController.js
const inventoryService = require('../services/inventoryService');

exports.getMonthlySales = async (req, res) => {
  try {
    const monthlySales = await inventoryService.getMonthlySales();
    res.json({ monthlySales });
  } catch (err) {
    console.error('Error in getMonthlySales:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendors = await inventoryService.getVendors();
    res.json({ vendors });
  } catch (error) {
    console.error('Error getting vendors:', error);
    res.status(500).json({ error: error.message });
  }
};