// backend/src/services/schedulerService.js
const { calculateAndUpdateReorderLevel } = require('./forecastService');
const supabase = require('../config/db');

// Run this daily at midnight to update all reorder levels
async function updateAllReorderLevels() {
  try {
    console.log('Starting daily reorder_level update...');
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id');

    if (error) throw error;

    const results = [];
    for (const product of products) {
      const result = await calculateAndUpdateReorderLevel(product.id);
      results.push(result);
    }

    console.log(`Updated reorder_level for ${results.length} products`);
    return results;
  } catch (error) {
    console.error('Error in updateAllReorderLevels:', error);
    throw error;
  }
}

module.exports = {
  updateAllReorderLevels
};