// backend/src/controllers/deliveryFeeController.js
const { 
  getDeliveryFeeConfig, 
  updateDeliveryFeeConfig, 
  calculateDeliveryFee,
  saveOrderDeliveryLocation,
  getOrderDeliveryLocation,
  getDefaultConfig
} = require('../services/deliveryFeeService');

const getConfig = async (req, res) => {
  try {
    const config = await getDeliveryFeeConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[getConfig] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch delivery fee configuration'
    });
  }
};

const updateConfig = async (req, res) => {
  try {
    const { base_fee, per_km_fee, store_latitude, store_longitude, store_address, free_delivery_above } = req.body;

    if (base_fee === undefined || base_fee < 0) {
      return res.status(400).json({
        success: false,
        message: 'Base fee is required and must be greater than or equal to 0'
      });
    }

    if (per_km_fee === undefined || per_km_fee < 0) {
      return res.status(400).json({
        success: false,
        message: 'Per KM fee is required and must be greater than or equal to 0'
      });
    }

    if (!store_latitude || !store_longitude) {
      return res.status(400).json({
        success: false,
        message: 'Store latitude and longitude are required'
      });
    }

    const config = await updateDeliveryFeeConfig({
      base_fee: parseFloat(base_fee),
      per_km_fee: parseFloat(per_km_fee),
      store_latitude: parseFloat(store_latitude),
      store_longitude: parseFloat(store_longitude),
      store_address: store_address || '',
      free_delivery_above: parseFloat(free_delivery_above || 0)
    });

    res.json({
      success: true,
      data: config,
      message: 'Delivery fee configuration updated successfully'
    });
  } catch (error) {
    console.error('[updateConfig] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update delivery fee configuration'
    });
  }
};

// Reset to default config
const resetToDefault = async (req, res) => {
  try {
    const defaultConfig = getDefaultConfig();
    const config = await updateDeliveryFeeConfig(defaultConfig);
    
    res.json({
      success: true,
      data: config,
      message: 'Delivery fee configuration reset to default'
    });
  } catch (error) {
    console.error('[resetToDefault] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset configuration'
    });
  }
};

const calculateFee = async (req, res) => {
  try {
    const { address, orderTotal } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const result = await calculateDeliveryFee(address, orderTotal || 0);

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[calculateFee] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate delivery fee'
    });
  }
};

const validateAddress = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const openRouteService = require('../services/openRouteService');
    
    try {
      const result = await openRouteService.geocode(address);
      res.json({
        success: true,
        data: {
          latitude: result.latitude,
          longitude: result.longitude,
          formatted_address: result.formatted_address
        }
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'Could not validate address. Please be more specific.',
        data: null
      });
    }
  } catch (error) {
    console.error('[validateAddress] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Save delivery location for an order
const saveLocation = async (req, res) => {
  try {
    const { orderId, address, latitude, longitude } = req.body;

    if (!orderId || !address) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and address are required'
      });
    }

    const location = await saveOrderDeliveryLocation(orderId, address, latitude, longitude);

    res.json({
      success: true,
      data: location,
      message: 'Delivery location saved successfully'
    });
  } catch (error) {
    console.error('[saveLocation] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save delivery location'
    });
  }
};

// Get delivery location for an order
const getLocation = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const location = await getOrderDeliveryLocation(orderId);

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('[getLocation] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get delivery location'
    });
  }
};



module.exports = {
  getConfig,
  updateConfig,
  calculateFee,
  validateAddress,
  saveLocation,
  getLocation,
  resetToDefault
};