// backend/src/controllers/deliveryController.js
const {
  getAllDeliveries,
  getDeliveryById,
  getRiderDeliveries,
  updateDeliveryStatus,
  getRiderStats,
  assignRiderToDelivery,
  getDeliveryLocation,
  updateDeliveryLocation,
  getDeliveryWithLocation,
  getAllDeliveriesWithLocations,
  getRiderDeliveriesWithLocations
} = require('../services/deliveryService');
const supabase = require('../config/db');
const cache = require('../config/cache');

// Cache configuration
const CACHE_TTL = {
  DELIVERIES_LIST: 30,        // 30 seconds for delivery lists
  SINGLE_DELIVERY: 60,        // 60 seconds for single delivery
  RIDER_DELIVERIES: 30,       // 30 seconds for rider deliveries
  RIDER_STATS: 60,            // 60 seconds for rider stats
  DELIVERY_PERSONNEL: 120,    // 2 minutes for delivery personnel
  DELIVERY_LOCATION: 30,      // 30 seconds for delivery location
};

const CACHE_KEYS = {
  ALL_DELIVERIES: 'deliveries_all',
  DELIVERY_PERSONNEL: 'delivery_personnel',
  DELIVERY_PREFIX: 'delivery_',
  RIDER_DELIVERIES_PREFIX: 'rider_deliveries_',
  RIDER_STATS_PREFIX: 'rider_stats_',
  DELIVERY_LOCATION_PREFIX: 'delivery_location_',
};

// Helper to invalidate delivery caches
const invalidateDeliveryCaches = (deliveryId, riderId = null) => {
  // Delete single delivery cache
  cache.del(`${CACHE_KEYS.DELIVERY_PREFIX}${deliveryId}`);
  cache.del(`${CACHE_KEYS.DELIVERY_LOCATION_PREFIX}${deliveryId}`);
  
  // Delete all deliveries list cache
  cache.del(CACHE_KEYS.ALL_DELIVERIES);
  
  // Delete rider's deliveries cache if riderId provided
  if (riderId) {
    cache.del(`${CACHE_KEYS.RIDER_DELIVERIES_PREFIX}${riderId}`);
    cache.del(`${CACHE_KEYS.RIDER_STATS_PREFIX}${riderId}`);
  }
};

// ========== GET DELIVERY PERSONNEL (RIDERS) ==========
const getDeliveryPersonnel = async (req, res) => {
  try {
    console.log('[getDeliveryPersonnel] Fetching all RIDERS...');

    // Check cache
    const cachedPersonnel = cache.get(CACHE_KEYS.DELIVERY_PERSONNEL);
    if (cachedPersonnel) {
      console.log('[getDeliveryPersonnel] Returning cached personnel');
      return res.json({
        success: true,
        personnel: cachedPersonnel,
        fromCache: true
      });
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', 'RIDER')
      .single();

    if (roleError) {
      console.error('[getDeliveryPersonnel] Role error:', roleError);
      return res.status(500).json({
        success: false,
        message: 'Failed to find RIDER role'
      });
    }

    console.log(`Found RIDER role with ID: ${role.id}`);

    const { data: personnel, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        phone_number,
        email,
        address
      `)
      .eq('role_id', role.id)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[getDeliveryPersonnel] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch delivery personnel'
      });
    }

    console.log(`Found ${personnel?.length || 0} riders`);

    const formattedPersonnel = (personnel || []).map(person => ({
      id: person.id,
      name: person.full_name || 'Unknown Rider',
      phone: person.phone_number || '',
      email: person.email || '',
      address: person.address || ''
    }));

    // Store in cache
    cache.set(CACHE_KEYS.DELIVERY_PERSONNEL, formattedPersonnel, CACHE_TTL.DELIVERY_PERSONNEL);

    res.json({
      success: true,
      personnel: formattedPersonnel
    });
  } catch (err) {
    console.error('[getDeliveryPersonnel]', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
};

// ========== GET ALL DELIVERIES (Admin) ==========
const getDeliveries = async (req, res) => {
  try {
    const { status, orderId } = req.query;
    const userId = req.user.id;

    // Build cache key based on query params
    const cacheKey = `${CACHE_KEYS.ALL_DELIVERIES}_${status || 'all'}_${orderId || 'none'}`;
    
    // Check cache
    const cachedDeliveries = cache.get(cacheKey);
    if (cachedDeliveries) {
      console.log('[getDeliveries] Returning cached deliveries');
      return res.json({ 
        success: true, 
        deliveries: cachedDeliveries,
        fromCache: true 
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('role_name')
      .eq('id', profile.role_id)
      .single();

    const ALLOWED_ROLES = ['ADMIN', 'CEO' ,'SALES_MANAGER'];

    if (roleError || !ALLOWED_ROLES.includes(role?.role_name)) {
      return res.status(403).json({ success: false, message: 'Admin or CEO access required' });
    }

    const deliveries = await getAllDeliveriesWithLocations({ status, orderId });
    
    // Store in cache
    cache.set(cacheKey, deliveries, CACHE_TTL.DELIVERIES_LIST);
    
    res.json({ success: true, deliveries });
  } catch (err) {
    console.error('[getDeliveries]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET SINGLE DELIVERY ==========
const getDelivery = async (req, res) => {
  try {
    let idParam = req.params.id;
    if (idParam.startsWith('DEL-')) idParam = idParam.replace('DEL-', '');
    const deliveryId = parseInt(idParam, 10);

    if (isNaN(deliveryId)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });
    }

    // Check cache
    const cacheKey = `${CACHE_KEYS.DELIVERY_PREFIX}${deliveryId}`;
    const cachedDelivery = cache.get(cacheKey);
    if (cachedDelivery) {
      console.log('[getDelivery] Returning cached delivery');
      return res.json({ 
        success: true, 
        delivery: cachedDelivery,
        fromCache: true 
      });
    }

    const delivery = await getDeliveryWithLocation(deliveryId);
    
    // Store in cache
    cache.set(cacheKey, delivery, CACHE_TTL.SINGLE_DELIVERY);
    
    res.json({ success: true, delivery });
  } catch (err) {
    console.error('[getDelivery]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET RIDER'S DELIVERIES ==========
const getMyDeliveries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const cacheKey = `${CACHE_KEYS.RIDER_DELIVERIES_PREFIX}${userId}_${status || 'all'}`;
    
    // Check cache
    const cachedDeliveries = cache.get(cacheKey);
    if (cachedDeliveries) {
      console.log('[getMyDeliveries] Returning cached rider deliveries');
      return res.json({ 
        success: true, 
        deliveries: cachedDeliveries.deliveries,
        stats: cachedDeliveries.stats,
        fromCache: true 
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('role_name')
      .eq('id', profile.role_id)
      .single();

    if (roleError || role?.role_name !== 'RIDER') {
      return res.status(403).json({ success: false, message: 'Rider access required' });
    }

    const deliveries = await getRiderDeliveriesWithLocations(userId, status);
    const stats = await getRiderStats(userId);

    const responseData = { deliveries, stats };
    
    // Store in cache
    cache.set(cacheKey, responseData, CACHE_TTL.RIDER_DELIVERIES);

    res.json({ success: true, deliveries, stats });
  } catch (err) {
    console.error('[getMyDeliveries]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== UPDATE DELIVERY STATUS ==========
const updateDelivery = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
    if (idParam.startsWith('DEL-')) idParam = idParam.replace('DEL-', '');
    const deliveryId = parseInt(idParam, 10);

    if (isNaN(deliveryId)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    // Verify this delivery belongs to the rider
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('delivery_person_id')
      .eq('id', deliveryId)
      .single();

    if (deliveryError) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    if (delivery.delivery_person_id !== userId) {
      return res.status(403).json({ success: false, message: 'This delivery is not assigned to you' });
    }

    const updatedDelivery = await updateDeliveryStatus(deliveryId, status);
    
    // Invalidate caches
    invalidateDeliveryCaches(deliveryId, userId);
    
    res.json({ success: true, delivery: updatedDelivery });
  } catch (err) {
    console.error('[updateDelivery]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET RIDER STATS ==========
const getMyStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check cache
    const cacheKey = `${CACHE_KEYS.RIDER_STATS_PREFIX}${userId}`;
    const cachedStats = cache.get(cacheKey);
    if (cachedStats) {
      console.log('[getMyStats] Returning cached rider stats');
      return res.json({ 
        success: true, 
        stats: cachedStats,
        fromCache: true 
      });
    }

    const stats = await getRiderStats(userId);
    
    // Store in cache
    cache.set(cacheKey, stats, CACHE_TTL.RIDER_STATS);
    
    res.json({ success: true, stats });
  } catch (err) {
    console.error('[getMyStats]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== ASSIGN RIDER TO DELIVERY (Admin) ==========
const assignRider = async (req, res) => {
  try {
    let idParam = req.params.id;
    if (idParam.startsWith('DEL-')) idParam = idParam.replace('DEL-', '');
    const deliveryId = parseInt(idParam, 10);

    if (isNaN(deliveryId)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });
    }

    const { riderId } = req.body;
    if (!riderId) {
      return res.status(400).json({ success: false, message: 'Rider ID is required' });
    }

    const delivery = await assignRiderToDelivery(deliveryId, riderId);
    
    // Invalidate caches
    invalidateDeliveryCaches(deliveryId, riderId);
    
    res.json({ success: true, delivery });
  } catch (err) {
    console.error('[assignRider]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== UPDATE DELIVERY LOCATION (Admin/Rider) ==========
const updateLocation = async (req, res) => {
  try {
    const { orderId, address, latitude, longitude } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const location = await updateDeliveryLocation(orderId, address, latitude, longitude);
    
    // Invalidate location caches
    cache.del(`${CACHE_KEYS.DELIVERY_LOCATION_PREFIX}${orderId}`);
    cache.del(`${CACHE_KEYS.DELIVERY_PREFIX}${orderId}`);
    
    res.json({ success: true, location });
  } catch (err) {
    console.error('[updateLocation]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET DELIVERY LOCATION ==========
const getLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const orderIdNum = parseInt(orderId, 10);
    
    // Check cache
    const cacheKey = `${CACHE_KEYS.DELIVERY_LOCATION_PREFIX}${orderIdNum}`;
    const cachedLocation = cache.get(cacheKey);
    if (cachedLocation) {
      console.log('[getLocation] Returning cached location');
      return res.json({ 
        success: true, 
        location: cachedLocation,
        fromCache: true 
      });
    }

    const location = await getDeliveryLocation(orderIdNum);
    
    // Store in cache
    cache.set(cacheKey, location, CACHE_TTL.DELIVERY_LOCATION);
    
    res.json({ success: true, location });
  } catch (err) {
    console.error('[getLocation]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDeliveries,
  getDelivery,
  getMyDeliveries,
  updateDelivery,
  getMyStats,
  assignRider,
  getDeliveryPersonnel,
  updateLocation,
  getLocation
};