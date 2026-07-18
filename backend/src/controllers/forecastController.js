const { getWeeklyHybridForecast } = require('../services/forecastService');
const supabase = require('../config/db');

exports.getForecast = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const forecast = await getWeeklyHybridForecast(Number(productId));
    res.json({ forecast });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.saveProductionPlan = async (req, res) => {
  try {
    const { planned_date, product_id, predicted_demand, planned_quantity, status } = req.body;

    if (!planned_date || !product_id || predicted_demand === undefined || planned_quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Upsert plan
    const planData = {
      planned_date,
      product_id,
      predicted_demand,
      planned_quantity,
      status: status || 'PLANNED'
    };

    const { data, error } = await supabase
      .from('production_plans')
      .upsert(planData, { onConflict: 'planned_date, product_id' })
      .select();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    res.status(200).json({
      message: 'Production plan saved',
      plan: data?.[0] || null
    });
  } catch (error) {
    console.error('Save plan error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};