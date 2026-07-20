const supabase = require('../config/db');

// ---------- Existing functions ----------
async function getCurrentStock(productId) {
  const { data, error } = await supabase
    .from('inventory')
    .select('current_stock')
    .eq('product_id', productId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return 0;
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }
  return data.current_stock || 0;
}

async function updateStockAndPlan(productId, addedQuantity, plannedDate) {
  const currentStock = await getCurrentStock(productId);
  const newStock = currentStock + addedQuantity;

  const { error: invError } = await supabase
    .from('inventory')
    .upsert({
      product_id: productId,
      current_stock: newStock,
      last_updated: new Date().toISOString()
    }, { onConflict: 'product_id' });

  if (invError) {
    throw new Error(`Inventory update failed: ${invError.message}`);
  }

  const { error: planError } = await supabase
    .from('production_plans')
    .update({
      status: 'COMPLETED',
      planned_quantity: addedQuantity
    })
    .eq('product_id', productId)
    .eq('planned_date', plannedDate);

  if (planError) {
    console.error('Failed to update production plan:', planError.message);
  }

  return newStock;
}

// ---------- New functions ----------
async function getProductsWithStock() {
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('*');
  if (prodErr) throw new Error(prodErr.message);

  const { data: inventory, error: invErr } = await supabase
    .from('inventory')
    .select('product_id, current_stock');
  if (invErr) throw new Error(invErr.message);

  const stockMap = {};
  inventory.forEach(item => {
    stockMap[item.product_id] = (stockMap[item.product_id] || 0) + item.current_stock;
  });

  return products.map(p => ({
    ...p,
    stock: stockMap[p.id] || 0,
    status: (stockMap[p.id] || 0) < 20 ? 'low' : 'sufficient',
    predicted: 0
  }));
}

async function getVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('isActive', true);
  if (error) throw new Error(error.message);
  return data;
}

async function getEmptyBottles() {
  const { data: refillProducts, error: prodErr } = await supabase
    .from('products')
    .select('id, name')
    .eq('type', 'REFILL');
  if (prodErr) throw new Error(prodErr.message);

  if (refillProducts.length === 0) return [];

  const productIds = refillProducts.map(p => p.id);
  const { data: inventory, error: invErr } = await supabase
    .from('inventory')
    .select('product_id, current_stock')
    .in('product_id', productIds);
  if (invErr) throw new Error(invErr.message);

  const stockMap = {};
  inventory.forEach(item => {
    stockMap[item.product_id] = (stockMap[item.product_id] || 0) + item.current_stock;
  });

  return refillProducts.map(p => ({
    id: p.id,
    product: p.name,
    stock: stockMap[p.id] || 0,
    status: (stockMap[p.id] || 0) < 10 ? 'low' : 'sufficient'
  }));
}

async function getMonthlySales() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoff = sixMonthsAgo.toISOString();

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      orders!inner (created_at)
    `)
    .gte('orders.created_at', cutoff)
    .neq('orders.order_status', 'CANCELLED');

  if (error) throw new Error(error.message);

  const monthMap = {};
  data.forEach(item => {
    const date = new Date(item.orders.created_at);
    const key = date.toISOString().slice(0, 7);
    if (!monthMap[key]) monthMap[key] = 0;
    monthMap[key] += Number(item.quantity) || 0;
  });

  const months = Object.keys(monthMap).sort();
  return months.map(m => ({
    month: m,
    actual: monthMap[m],
    predicted: Math.round(monthMap[m] * 1.05)
  }));
}

module.exports = {
  getCurrentStock,
  updateStockAndPlan,
  getProductsWithStock,
  getVendors,
  getEmptyBottles,
  getMonthlySales
};