// Import your existing Supabase client from db.js
const { supabase } = require('../config/db');

const getAllVendors = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const createVendor = async (req, res) => {
  try {
    const { vendor_name, contact_number, supply_type, isActive } = req.body;
    const { data, error } = await supabase
      .from('vendors')
      .insert([{ vendor_name, contact_number, supply_type, isActive, last_delivery: null }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendor_name, contact_number, supply_type, isActive } = req.body;
    const { data, error } = await supabase
      .from('vendors')
      .update({ vendor_name, contact_number, supply_type, isActive })
      .eq('id', id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllVendors, createVendor, updateVendor, deleteVendor };
