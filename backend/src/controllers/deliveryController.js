// backend/src/controllers/deliveryController.js
const {
  getAllDeliveries,
  getDeliveryById,
  getRiderDeliveries,
  updateDeliveryStatus,
  getRiderStats,
  assignRiderToDelivery
} = require('../services/deliveryService');
const supabase = require('../config/db');

// ========== GET DELIVERY PERSONNEL (RIDERS) ==========
const getDeliveryPersonnel = async (req, res) => {
  try {
    console.log('🔍 [getDeliveryPersonnel] Fetching all RIDERS...');

    // Get RIDER role ID
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', 'RIDER')
      .single();

    if (roleError) {
      console.error('❌ [getDeliveryPersonnel] Role error:', roleError);
      return res.status(500).json({
        success: false,
        message: 'Failed to find RIDER role'
      });
    }

    console.log(`✅ Found RIDER role with ID: ${role.id}`);

    // Get all profiles with RIDER role
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
      console.error('❌ [getDeliveryPersonnel] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch delivery personnel'
      });
    }

    console.log(`✅ Found ${personnel?.length || 0} riders`);

    // Format response
    const formattedPersonnel = (personnel || []).map(person => ({
      id: person.id,
      name: person.full_name || 'Unknown Rider',
      phone: person.phone_number || '',
      email: person.email || '',
      address: person.address || ''
    }));

    res.json({
      success: true,
      personnel: formattedPersonnel
    });
  } catch (err) {
    console.error('💥 [getDeliveryPersonnel]', err);
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

    // Check if user is admin
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

    if (roleError || role?.role_name !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const deliveries = await getAllDeliveries({ status, orderId });
    res.json({ success: true, deliveries });
  } catch (err) {
    console.error('💥 [getDeliveries]', err);
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

    const delivery = await getDeliveryById(deliveryId);
    res.json({ success: true, delivery });
  } catch (err) {
    console.error('💥 [getDelivery]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET RIDER'S DELIVERIES ==========
const getMyDeliveries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    // Check if user is a rider
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

    const deliveries = await getRiderDeliveries(userId, status);
    const stats = await getRiderStats(userId);

    res.json({ success: true, deliveries, stats });
  } catch (err) {
    console.error('💥 [getMyDeliveries]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== UPDATE DELIVERY STATUS (Rider) ==========
const updateDelivery = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
    if (idParam.startsWith('DEL-')) idParam = idParam.replace('DEL-', '');
    const deliveryId = parseInt(idParam, 10);

    if (isNaN(deliveryId)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery ID' });
    }

    const { status, emptyBottles } = req.body;
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

    const updatedDelivery = await updateDeliveryStatus(
      deliveryId,
      status
    );

    res.json({ success: true, delivery: updatedDelivery });
  } catch (err) {
    console.error('💥 [updateDelivery]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET RIDER STATS ==========
const getMyStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await getRiderStats(userId);
    res.json({ success: true, stats });
  } catch (err) {
    console.error('💥 [getMyStats]', err);
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
    res.json({ success: true, delivery });
  } catch (err) {
    console.error('💥 [assignRider]', err);
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
  getDeliveryPersonnel // Added
};