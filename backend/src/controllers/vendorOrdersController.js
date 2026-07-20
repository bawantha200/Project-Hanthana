// controllers/vendorOrdersController.js
const supabase = require('../config/db');

const vendorOrdersController = {
  async getVendorOrders(req, res) {
    try {
      const { vendorId, status, dateFrom, dateTo } = req.query;

      let query = supabase
        .from('vendor_orders')
        .select('*, vendors(vendor_name), products(name)')
        .order('order_date', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (dateFrom) {
        query = query.gte('order_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('order_date', dateTo);
      }

      const { data, error } = await query;
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      res.status(500).json({ error: 'Failed to fetch vendor orders' });
    }
  },
};

module.exports = { vendorOrdersController };