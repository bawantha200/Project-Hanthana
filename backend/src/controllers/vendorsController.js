// controllers/vendorsController.js
const { vendorsService } = require('../services/vendorsService');

const vendorsController = {
  async getVendors(req, res) {
    try {
      const { search } = req.query;
      const vendors = await vendorsService.getAllVendors(search);
      res.status(200).json(vendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  },

  async getVendor(req, res) {
    try {
      const { id } = req.params;
      const vendorId = parseInt(id, 10);
      if (isNaN(vendorId)) {
        return res.status(400).json({ error: 'Invalid vendor ID' });
      }
      const vendor = await vendorsService.getVendorById(vendorId);
      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      res.status(200).json(vendor);
    } catch (error) {
      console.error('Error fetching vendor:', error);
      res.status(500).json({ error: 'Failed to fetch vendor' });
    }
  },

  async createVendor(req, res) {
    try {
      const vendorData = req.body;
      if (!vendorData.name || !vendorData.email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }
      const newVendor = await vendorsService.createVendor(vendorData);
      res.status(201).json(newVendor);
    } catch (error) {
      console.error('Error creating vendor:', error);
      res.status(500).json({ error: 'Failed to create vendor' });
    }
  },

  async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const vendorId = parseInt(id, 10);
      if (isNaN(vendorId)) {
        return res.status(400).json({ error: 'Invalid vendor ID' });
      }
      const vendorData = req.body;
      const updated = await vendorsService.updateVendor(vendorId, vendorData);
      res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating vendor:', error);
      res.status(500).json({ error: 'Failed to update vendor' });
    }
  },

  async deleteVendor(req, res) {
    try {
      const { id } = req.params;
      const vendorId = parseInt(id, 10);
      if (isNaN(vendorId)) {
        return res.status(400).json({ error: 'Invalid vendor ID' });
      }
      await vendorsService.deleteVendor(vendorId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({ error: 'Failed to delete vendor' });
    }
  },
};

module.exports = { vendorsController };