// services/vendorsService.js
const supabase = require('../config/db');

// Transform DB row → frontend object
const toVendor = (row) => ({
  id: row.id,
  name: row.vendor_name,
  contact: row.contact_person,
  phone: row.contact_number,
  email: row.email,
  supplyType: row.supply_type,
  status: row.isActive ? 'active' : 'inactive',
  lastDelivery: row.last_delivery,
});

const vendorsService = {
  async getAllVendors(search = '') {
    let query = supabase
      .from('vendors')
      .select('*')
      .order('vendor_name', { ascending: true });

    if (search) {
      query = query.or(
        `vendor_name.ilike.%${search}%,` +
        `contact_person.ilike.%${search}%,` +
        `contact_number.ilike.%${search}%,` +
        `email.ilike.%${search}%,` +
        `supply_type.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(toVendor);
  },

  async getVendorById(id) {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return toVendor(data);
  },

  async createVendor(vendorData) {
    const newVendor = {
      vendor_name: vendorData.name,
      contact_person: vendorData.contact,
      contact_number: vendorData.phone,
      email: vendorData.email,
      supply_type: vendorData.supplyType,
      isActive: vendorData.status === 'active',
      // Set default last_delivery to now if not provided
      last_delivery: vendorData.lastDelivery || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('vendors')
      .insert([newVendor])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toVendor(data);
  },

  async updateVendor(id, vendorData) {
    // Build update object without last_delivery unless provided
    const updated = {
      vendor_name: vendorData.name,
      contact_person: vendorData.contact,
      contact_number: vendorData.phone,
      email: vendorData.email,
      supply_type: vendorData.supplyType,
      isActive: vendorData.status === 'active',
    };

    // Only include last_delivery if the frontend sent it
    if (vendorData.lastDelivery !== undefined) {
      updated.last_delivery = vendorData.lastDelivery;
    }

    const { data, error } = await supabase
      .from('vendors')
      .update(updated)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toVendor(data);
  },

  async deleteVendor(id) {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  },
};

module.exports = { vendorsService };