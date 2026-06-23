const supabase = require('../config/db');

async function getDailySales(productId, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString();

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      orders!inner (
        created_at,
        order_status
      )
    `)
    .eq('product_id', productId)
    .neq('orders.order_status', 'CANCELLED')
    .gte('orders.created_at', cutoffStr);

  if (error) throw new Error(`Supabase error: ${error.message}`);

  const dailyMap = new Map();
  data.forEach(item => {
    const date = new Date(item.orders.created_at);
    const key = date.toISOString().split('T')[0];
    const qty = Number(item.quantity) || 0;
    dailyMap.set(key, (dailyMap.get(key) || 0) + qty);
  });

  const result = [];
  let current = new Date(cutoffDate);
  const end = new Date();
  while (current <= end) {
    const key = current.toISOString().split('T')[0];
    result.push({
      date: key,
      sales: dailyMap.get(key) || 0,
      dayOfWeek: current.getDay()
    });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

async function getWeeklyHybridForecast(productId) {
  const dailyData = await getDailySales(productId, 30);
  if (dailyData.length === 0) {
    throw new Error('No sales data found for this product');
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const result = [];

  for (let i = 1; i <= 7; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + i);
    const targetDow = forecastDate.getDay();
    const dateStr = forecastDate.toISOString().split('T')[0];

    const sameDowEntries = dailyData.filter(d => d.dayOfWeek === targetDow);
    let sma = 0;
    if (sameDowEntries.length > 0) {
      const total = sameDowEntries.reduce((sum, d) => sum + d.sales, 0);
      sma = total / sameDowEntries.length;
    }
    const rounded = Math.round(sma);

    result.push({
      day: dayNames[targetDow],
      date: dateStr,
      overall: rounded
    });
  }

  return result;
}

module.exports = { getWeeklyHybridForecast };