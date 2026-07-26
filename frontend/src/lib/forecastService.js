import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchProducts = async (typeFilter = 'ALL') => {
  let query = supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (typeFilter !== 'ALL') {
    query = query.eq('type', typeFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
};

export const get7DayFutureDemandAllProducts = async () => {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 7);

  const { data, error } = await supabase
    .from('daily_demand_forecasts')
    .select(`
      id,
      product_id,
      forecast_date,
      predicted_demand,
      actual_sales,
      algorithm_used,
      products:product_id (
        id,
        name,
        type,
        unit_price
      )
    `)
    .gte('forecast_date', today.toISOString().split('T')[0])
    .lte('forecast_date', endDate.toISOString().split('T')[0])
    .order('forecast_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

export const getHistoricalVsPredicted = async (productId, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('daily_demand_forecasts')
    .select('forecast_date, predicted_demand, actual_sales')
    .eq('product_id', parseInt(productId))
    .gte('forecast_date', startDate.toISOString().split('T')[0])
    .order('forecast_date', { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map(item => ({
    date: item.forecast_date,
    predicted: item.predicted_demand || 0,
    actual: item.actual_sales || 0
  }));
};

export const calculateAndSaveDailyForecast = async () => {
  const response = await fetch(`${API_URL}/demand-forecast/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to calculate forecast');
  }

  return await response.json();
};

export const seedHistoricalForecastsFromCSV = async (rows) => {
  const response = await fetch(`${API_URL}/demand-forecast/upload-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload CSV data');
  }

  const result = await response.json();
  return result.rowsIngested || 0;
};

export const parseCsv = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
};

export const getProductionPlan = async () => {
  const response = await fetch(`${API_URL}/demand-forecast/production-plan`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get production plan');
  }

  const result = await response.json();
  return result.data || [];
};

export const getProductDemandSummary = async (productId) => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 30);

  const { data, error } = await supabase
    .from('daily_demand_forecasts')
    .select('forecast_date, predicted_demand, actual_sales')
    .eq('product_id', parseInt(productId))
    .gte('forecast_date', startDate.toISOString().split('T')[0])
    .order('forecast_date', { ascending: true });

  if (error) throw new Error(error.message);

  const totalPredicted = data?.reduce((sum, d) => sum + (d.predicted_demand || 0), 0) || 0;
  const totalActual = data?.reduce((sum, d) => sum + (d.actual_sales || 0), 0) || 0;
  const accuracy = totalPredicted > 0 ? (totalActual / totalPredicted) * 100 : 0;

  return {
    totalPredicted,
    totalActual,
    accuracy: Math.min(accuracy, 100),
    data: data || []
  };
};


// ✅ FIXED: Use 'inventory' instead of 'product_stock'
export const getProductStock = async () => {
  try {
    const { data, error } = await supabase
      .from('inventory')  // ← Changed from 'product_stock' to 'inventory'
      .select('*');
    
    if (error) throw new Error(error.message);
    return data || [];
  } catch (error) {
    console.error('Error fetching stock:', error);
    return [];
  }
};

// ✅ FIXED: Use 'inventory' instead of 'product_stock'
export const getStockLevels = async () => {
  try {
    const { data, error } = await supabase
      .from('inventory')  // ← Changed from 'product_stock' to 'inventory'
      .select(`
        *,
        products:product_id (
          id,
          name,
          type,
          unit_price
        )
      `);
    
    if (error) throw new Error(error.message);
    return data || [];
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    return [];
  }
};