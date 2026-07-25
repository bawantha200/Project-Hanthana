// backend/src/services/deliveryFeeService.js
const supabase = require('../config/db');
const openRouteService = require('./openRouteService');

// ============ DELIVERY FEE CONFIG ============
const getDeliveryFeeConfig = async () => {
  try {
    console.log('[getDeliveryFeeConfig] Fetching config from database...');
    
    // Get the latest config (only one row should exist)
    const { data, error } = await supabase
      .from('delivery_fee_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching config:', error);
      return getDefaultConfig();
    }

    if (!data) {
      console.log('[getDeliveryFeeConfig] No config found, creating default...');
      const defaultConfig = getDefaultConfig();
      
      const { data: newData, error: insertError } = await supabase
        .from('delivery_fee_config')
        .insert({
          base_fee: defaultConfig.base_fee,
          per_km_fee: defaultConfig.per_km_fee,
          store_latitude: defaultConfig.store_latitude,
          store_longitude: defaultConfig.store_longitude,
          store_address: defaultConfig.store_address,
          free_delivery_above: defaultConfig.free_delivery_above
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Failed to create default config:', insertError);
        return defaultConfig;
      }

      return {
        base_fee: parseFloat(newData.base_fee),
        per_km_fee: parseFloat(newData.per_km_fee),
        store_latitude: parseFloat(newData.store_latitude),
        store_longitude: parseFloat(newData.store_longitude),
        store_address: newData.store_address,
        free_delivery_above: parseFloat(newData.free_delivery_above || 0)
      };
    }

    console.log('[getDeliveryFeeConfig] Config found:', data);
    return {
      base_fee: parseFloat(data.base_fee),
      per_km_fee: parseFloat(data.per_km_fee),
      store_latitude: parseFloat(data.store_latitude),
      store_longitude: parseFloat(data.store_longitude),
      store_address: data.store_address,
      free_delivery_above: parseFloat(data.free_delivery_above || 0)
    };
  } catch (error) {
    console.error('Error in getDeliveryFeeConfig:', error);
    return getDefaultConfig();
  }
};

const getDefaultConfig = () => ({
  base_fee: 0,
  per_km_fee: 0,
  store_latitude: 7.074400,
  store_longitude: 79.891900,
  store_address: 'Ja Ela, Sri Lanka',
  free_delivery_above: 0
});

const updateDeliveryFeeConfig = async (config) => {
  try {
    console.log('[updateDeliveryFeeConfig] Updating config:', config);

    // Check if config exists
    const { data: existing, error: checkError } = await supabase
      .from('delivery_fee_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing config:', checkError);
      throw checkError;
    }

    let result;
    if (existing) {
      // Update existing config
      const { data, error } = await supabase
        .from('delivery_fee_config')
        .update({
          base_fee: config.base_fee,
          per_km_fee: config.per_km_fee,
          store_latitude: config.store_latitude,
          store_longitude: config.store_longitude,
          store_address: config.store_address,
          free_delivery_above: config.free_delivery_above || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating config:', error);
        throw error;
      }
      result = data;
    } else {
      // Insert new config
      const { data, error } = await supabase
        .from('delivery_fee_config')
        .insert({
          base_fee: config.base_fee,
          per_km_fee: config.per_km_fee,
          store_latitude: config.store_latitude,
          store_longitude: config.store_longitude,
          store_address: config.store_address,
          free_delivery_above: config.free_delivery_above || 0
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error inserting config:', error);
        throw error;
      }
      result = data;
    }

    return {
      base_fee: parseFloat(result.base_fee),
      per_km_fee: parseFloat(result.per_km_fee),
      store_latitude: parseFloat(result.store_latitude),
      store_longitude: parseFloat(result.store_longitude),
      store_address: result.store_address,
      free_delivery_above: parseFloat(result.free_delivery_above || 0)
    };
  } catch (error) {
    console.error('Error in updateDeliveryFeeConfig:', error);
    throw error;
  }
};

// ============ ORDER DELIVERY LOCATIONS ============
const saveOrderDeliveryLocation = async (orderId, address, latitude, longitude) => {
  try {
    console.log('[saveOrderDeliveryLocation] Saving location for order:', orderId);
    console.log('[saveOrderDeliveryLocation] Address:', address);
    console.log('[saveOrderDeliveryLocation] Coordinates:', latitude, longitude);

    // Check if location already exists
    const { data: existing, error: checkError } = await supabase
      .from('order_delivery_locations')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing location:', checkError);
    }

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('order_delivery_locations')
        .update({
          address: address,
          latitude: latitude,
          longitude: longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating location:', error);
        throw error;
      }
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('order_delivery_locations')
        .insert({
          order_id: orderId,
          address: address,
          latitude: latitude,
          longitude: longitude
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error inserting location:', error);
        throw error;
      }
      result = data;
    }

    console.log('[saveOrderDeliveryLocation] ✅ Location saved:', result);
    return result;
  } catch (error) {
    console.error('[saveOrderDeliveryLocation] Error:', error);
    throw error;
  }
};

const getOrderDeliveryLocation = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('order_delivery_locations')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching location:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getOrderDeliveryLocation] Error:', error);
    return null;
  }
};

// ============ DELIVERY FEE CALCULATION ============

const calculateDeliveryFee = async (address, orderTotal = 0) => {
  try {
    console.log('[calculateDeliveryFee] Address (customer):', address);
    console.log('[calculateDeliveryFee] Order Total:', orderTotal);

    const config = await getDeliveryFeeConfig();
    console.log('[calculateDeliveryFee] Store config:', config);

    // Check for free delivery
    if (config.free_delivery_above && orderTotal >= config.free_delivery_above) {
      return {
        success: true,
        data: {
          distance_km: 0,
          duration_minutes: 0,
          delivery_fee: 0,
          message: 'Free delivery (order above threshold)',
          source: 'Free Delivery',
          to_lat: null,
          to_lng: null,
          from_lat: config.store_latitude,
          from_lng: config.store_longitude,
          store_address: config.store_address
        }
      };
    }

    // ✅ Use the customer's address, NOT the store address
    const result = await openRouteService.calculateDeliveryFee(
      config.store_address,  // FROM: Store address
      address,               // TO: Customer's address
      config,
      orderTotal
    );

    if (!result || typeof result.delivery_fee !== 'number') {
      return {
        success: true,
        data: {
          distance_km: 0,
          duration_minutes: 0,
          delivery_fee: config.base_fee || 0,
          message: 'Using default delivery fee',
          source: 'Default',
          to_lat: null,
          to_lng: null,
          from_lat: config.store_latitude,
          from_lng: config.store_longitude,
          store_address: config.store_address
        }
      };
    }

    return {
      success: true,
      data: {
        distance_km: result.distance_km || 0,
        duration_minutes: result.duration_minutes || 0,
        delivery_fee: result.delivery_fee,
        message: result.message || 'Delivery fee calculated',
        source: result.source || 'Unknown',
        isFallback: result.isFallback || false,
        // ✅ Return the customer's coordinates from the result
        to_lat: result.to?.latitude || null,
        to_lng: result.to?.longitude || null,
        from_lat: result.from?.latitude || config.store_latitude,
        from_lng: result.from?.longitude || config.store_longitude,
        store_address: config.store_address,
        // ✅ Also return the customer's formatted address
        to_address: result.to?.formatted_address || address
      }
    };
  } catch (error) {
    console.error('[calculateDeliveryFee] Error:', error);
    const config = await getDeliveryFeeConfig();
    return {
      success: true,
      data: {
        distance_km: 0,
        duration_minutes: 0,
        delivery_fee: config.base_fee || 0,
        message: 'Using default delivery fee (calculation failed)',
        source: 'Default',
        to_lat: null,
        to_lng: null,
        from_lat: config.store_latitude,
        from_lng: config.store_longitude,
        store_address: config.store_address
      }
    };
  }
};

const validateAddress = async (address) => {
  try {
    const result = await openRouteService.geocode(address);
    return result;
  } catch (error) {
    console.error('[validateAddress] Error:', error);
    throw error;
  }
};

module.exports = {
  getDeliveryFeeConfig,
  updateDeliveryFeeConfig,
  calculateDeliveryFee,
  validateAddress,
  saveOrderDeliveryLocation,
  getOrderDeliveryLocation,
  getDefaultConfig
};