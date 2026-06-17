// controllers/customerController.js
const customerService = require('../services/customerService');

// Get all customers with filters
const getAllCustomers = async (req, res) => {
  try {
    const { status, search } = req.query;
    const customers = await customerService.getAllCustomers({ status, search });
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message,
    });
  }
};

// Get single customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message,
    });
  }
};

// Create a new customer
const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    const newCustomer = await customerService.createCustomer(customerData);
    res.status(201).json({ success: true, data: newCustomer });
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error.code === 'DUPLICATE_EMAIL') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message,
    });
  }
};

// Update an existing customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await customerService.updateCustomer(id, updates);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message,
    });
  }
};

// Soft-delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await customerService.deleteCustomer(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Customer deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message,
    });
  }
};

// Get customer statistics
const getCustomerStatistics = async (req, res) => {
  try {
    const stats = await customerService.getCustomerStatistics();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStatistics,
};