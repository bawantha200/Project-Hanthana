/**
 * demandForecastService.js
 *
 * Core business logic for the JIT Demand Forecasting System.
 * Uses a 3-Month (92-day) Simple Moving Average (SMA) on completed order_items
 * to predict daily demand per product, persisted into `daily_demand_forecasts`.
 *
 * NOTE: Adjust the supabase client import below to match your project's actual
 * path (e.g. '../config/supabaseClient' or '../config/supabase'). It must export
 * an initialized supabase-js client instance.
 */

const supabase = require('../config/db');
const cron = require('node-cron');

// ---- Constants -------------------------------------------------------

const SMA_WINDOW_DAYS = 92; // ~3 calendar months
const FORECAST_HORIZON_DAYS = 7;
const ALGORITHM_NAME = 'SMA_3M_DOW'; // Day-Of-Week aware SMA (was SMA_3M_DAILY, a flat average)
const COMPLETED_ORDER_STATUSES = ['delivered', 'completed']; // orders in either state count as sold
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---- Date helpers ------------------------------------------------------

function toDateOnlyString(date) {
  return date.toISOString().split('T')[0];
}

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Counts how many times each weekday (0=Sunday..6=Saturday) occurs between
 * windowStart and windowEnd inclusive. Needed because a 92-day window
 * doesn't divide evenly into exactly 13 of each weekday - it's 13 for some
 * and 14 for others depending on where the window starts.
 */
function countWeekdayOccurrences(windowStart, windowEnd) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const cursor = new Date(windowStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(windowEnd);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    counts[cursor.getDay()] += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return counts;
}

// ---- Core calculations ---------------------------------------------------

/**
 * calculate3MDailySMA(productId)
 * LEGACY / flat average: Daily Demand = ROUND(Total Quantity Sold in last 92 days / 92).
 * Kept for backward compatibility, but runDailyForecastCron() and
 * get7DayForecastForProduct() now use calculateDayOfWeekSMA() instead, since
 * a flat average treats Monday and Saturday demand as identical, which
 * doesn't hold for a business with weekly demand patterns.
 */
async function calculate3MDailySMA(productId) {
  try {
    if (!productId) throw new Error('productId is required');

    const windowStart = addDays(new Date(), -SMA_WINDOW_DAYS);

    console.log(
      `[demandForecastService] Calculating flat 3M SMA for product ${productId} since ${windowStart.toISOString()}`
    );

    const { data, error } = await supabase
      .from('order_items')
      .select('quantity, orders!inner(created_at, order_status)')
      .eq('product_id', productId)
      .in('orders.order_status', COMPLETED_ORDER_STATUSES)
      .gte('orders.created_at', windowStart.toISOString());

    if (error) throw error;

    const totalSold = (data || []).reduce((sum, row) => sum + (row.quantity || 0), 0);
    const dailyDemand = Math.round(totalSold / SMA_WINDOW_DAYS);

    console.log(
      `[demandForecastService] Product ${productId} -> totalSold(92d)=${totalSold}, flat dailyDemand=${dailyDemand}`
    );

    return {
      productId,
      totalSold,
      windowDays: SMA_WINDOW_DAYS,
      dailyDemand,
    };
  } catch (err) {
    console.error(`[demandForecastService] calculate3MDailySMA failed for product ${productId}:`, err.message);
    throw err;
  }
}

/**
 * calculateDayOfWeekSMA(productId)
 * Computes a SEPARATE average for each day of the week using the last 92
 * days of completed orders, e.g.:
 *   Monday demand    = (total qty sold on all Mondays in window) / (# Mondays in window)
 *   Tuesday demand    = (total qty sold on all Tuesdays in window) / (# Tuesdays in window)
 *   ...and so on through Sunday.
 * This captures the fact that a Saturday's order volume is usually very
 * different from a Tuesday's.
 */
async function calculateDayOfWeekSMA(productId) {
  try {
    if (!productId) throw new Error('productId is required');

    const windowStart = addDays(new Date(), -SMA_WINDOW_DAYS);
    const windowEnd = new Date();

    console.log(
      `[demandForecastService] Calculating day-of-week SMA for product ${productId} (${windowStart.toISOString()} -> ${windowEnd.toISOString()})`
    );

    const { data, error } = await supabase
      .from('order_items')
      .select('quantity, orders!inner(created_at, order_status)')
      .eq('product_id', productId)
      .in('orders.order_status', COMPLETED_ORDER_STATUSES)
      .gte('orders.created_at', windowStart.toISOString());

    if (error) throw error;

    const totalsByWeekday = [0, 0, 0, 0, 0, 0, 0];

    (data || []).forEach((row) => {
      const createdAt = row.orders?.created_at;
      if (!createdAt) return;
      const weekday = new Date(createdAt).getDay(); // 0=Sunday..6=Saturday
      totalsByWeekday[weekday] += row.quantity || 0;
    });

    const occurrenceCounts = countWeekdayOccurrences(windowStart, windowEnd);

    const byWeekday = WEEKDAY_NAMES.map((name, idx) => {
      const totalSold = totalsByWeekday[idx];
      const occurrences = occurrenceCounts[idx] || 1; // guard against divide-by-zero
      const dailyDemand = Math.round(totalSold / occurrences);
      return { weekday: idx, name, totalSold, occurrences, dailyDemand };
    });

    console.log(
      `[demandForecastService] Product ${productId} day-of-week demand: ${byWeekday
        .map((d) => `${d.name}=${d.dailyDemand}`)
        .join(', ')}`
    );

    return { productId, windowDays: SMA_WINDOW_DAYS, byWeekday };
  } catch (err) {
    console.error(`[demandForecastService] calculateDayOfWeekSMA failed for product ${productId}:`, err.message);
    throw err;
  }
}

/**
 * Small helper: given a byWeekday breakdown (from calculateDayOfWeekSMA) and
 * a target Date, returns that date's predicted daily demand.
 */
function getDemandForDate(byWeekday, targetDate) {
  const weekdayIndex = targetDate.getDay();
  const entry = byWeekday.find((d) => d.weekday === weekdayIndex);
  return entry ? entry.dailyDemand : 0;
}

/**
 * Fetches all products considered "active". Adjust the filter if your
 * products table has an `is_active` / `is_deleted` flag.
 */
async function getActiveProducts() {
  try {
    const { data, error } = await supabase.from('products').select('id, name, stock');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[demandForecastService] getActiveProducts failed:', err.message);
    throw err;
  }
}

/**
 * runDailyForecastCron()
 * Iterates over every active product, calculates tomorrow's SMA forecast,
 * and UPSERTS it into daily_demand_forecasts keyed on (product_id, forecast_date).
 */
async function runDailyForecastCron() {
  const startedAt = new Date().toISOString();
  console.log(`[demandForecastService] === Nightly forecast cron started at ${startedAt} ===`);

  const summary = { forecastDate: null, success: [], failed: [] };

  try {
    const products = await getActiveProducts();
    const forecastDateObj = addDays(new Date(), 1);
    const forecastDate = toDateOnlyString(forecastDateObj);
    const forecastWeekdayName = WEEKDAY_NAMES[forecastDateObj.getDay()];
    summary.forecastDate = forecastDate;

    console.log(
      `[demandForecastService] Forecasting for ${products.length} product(s), target date ${forecastDate} (${forecastWeekdayName})`
    );

    for (const product of products) {
      try {
        const { byWeekday } = await calculateDayOfWeekSMA(product.id);
        const dailyDemand = getDemandForDate(byWeekday, forecastDateObj);

        const { error: upsertError } = await supabase
          .from('daily_demand_forecasts')
          .upsert(
            {
              product_id: product.id,
              forecast_date: forecastDate,
              predicted_demand: dailyDemand,
              algorithm_used: ALGORITHM_NAME,
            },
            { onConflict: 'product_id,forecast_date' }
          );

        if (upsertError) throw upsertError;

        console.log(
          `[demandForecastService] ✅ Upserted forecast for product ${product.id} (${product.name}) on ${forecastDate} (${forecastWeekdayName}): ${dailyDemand} units`
        );
        summary.success.push({ productId: product.id, name: product.name, forecastDate, weekday: forecastWeekdayName, dailyDemand });
      } catch (productErr) {
        console.error(
          `[demandForecastService] ❌ Failed forecasting product ${product.id}:`,
          productErr.message
        );
        summary.failed.push({ productId: product.id, error: productErr.message });
      }
    }

    console.log(
      `[demandForecastService] === Cron run complete. Success: ${summary.success.length}, Failed: ${summary.failed.length} ===`
    );
    return summary;
  } catch (err) {
    console.error('[demandForecastService] runDailyForecastCron fatal error:', err.message);
    throw err;
  }
}

/**
 * get7DayForecastForProduct(productId)
 * Returns predicted demand for the next 7 days (tomorrow .. tomorrow+6).
 * Uses any already-stored rows in daily_demand_forecasts, and generates
 * (calculates + persists) any missing days on the fly using the current SMA.
 */
async function get7DayForecastForProduct(productId) {
  try {
    if (!productId) throw new Error('productId is required');

    const rangeStart = toDateOnlyString(addDays(new Date(), 1));
    const rangeEnd = toDateOnlyString(addDays(new Date(), FORECAST_HORIZON_DAYS));

    console.log(
      `[demandForecastService] Fetching 7-day forecast for product ${productId} (${rangeStart} -> ${rangeEnd})`
    );

    const { data: existingRows, error } = await supabase
      .from('daily_demand_forecasts')
      .select('forecast_date, predicted_demand, algorithm_used')
      .eq('product_id', productId)
      .gte('forecast_date', rangeStart)
      .lte('forecast_date', rangeEnd)
      .order('forecast_date', { ascending: true });

    if (error) throw error;

    const existingMap = new Map((existingRows || []).map((row) => [row.forecast_date, row]));
    const forecast = [];
    let cachedByWeekday = null; // computed once, reused across all 7 days

    for (let offset = 1; offset <= FORECAST_HORIZON_DAYS; offset++) {
      const targetDateObj = addDays(new Date(), offset);
      const targetDate = toDateOnlyString(targetDateObj);
      const targetWeekdayName = WEEKDAY_NAMES[targetDateObj.getDay()];

      if (existingMap.has(targetDate)) {
        const row = existingMap.get(targetDate);
        const predictedDemand = row.predicted_demand;
        forecast.push({
          date: targetDate,
          weekday: targetWeekdayName,
          predictedDemand,
          low: Math.round(predictedDemand * 0.8),
          high: Math.round(predictedDemand * 1.2),
          algorithmUsed: row.algorithm_used,
          source: 'stored',
        });
        continue;
      }

      // Missing day - generate it using the day-of-week SMA (computed once, reused for every gap)
      if (cachedByWeekday === null) {
        const smaResult = await calculateDayOfWeekSMA(productId);
        cachedByWeekday = smaResult.byWeekday;
      }

      const predictedDemand = getDemandForDate(cachedByWeekday, targetDateObj);

      const { error: insertError } = await supabase
        .from('daily_demand_forecasts')
        .upsert(
          {
            product_id: productId,
            forecast_date: targetDate,
            predicted_demand: predictedDemand,
            algorithm_used: ALGORITHM_NAME,
          },
          { onConflict: 'product_id,forecast_date' }
        );

      if (insertError) {
        console.error(
          `[demandForecastService] Failed to backfill forecast for product ${productId} on ${targetDate}:`,
          insertError.message
        );
      } else {
        console.log(
          `[demandForecastService] Generated + persisted missing forecast for product ${productId} on ${targetDate} (${targetWeekdayName}): ${predictedDemand} units`
        );
      }

      forecast.push({
        date: targetDate,
        weekday: targetWeekdayName,
        predictedDemand,
        low: Math.round(predictedDemand * 0.8),
        high: Math.round(predictedDemand * 1.2),
        algorithmUsed: ALGORITHM_NAME,
        source: 'generated',
      });
    }

    const totalPredicted = forecast.reduce((sum, day) => sum + (day.predictedDemand || 0), 0);
    const dailyAverage = forecast.length ? Math.round(totalPredicted / forecast.length) : 0;

    return {
      productId,
      forecast,
      totalPredicted,
      dailyAverage,
    };
  } catch (err) {
    console.error(`[demandForecastService] get7DayForecastForProduct failed for product ${productId}:`, err.message);
    throw err;
  }
}

/**
 * getForecastAnalytics(productId, lookbackDays = 30)
 * Returns historical predicted vs actual sales, for charting accuracy over time.
 */
async function getForecastAnalytics(productId, lookbackDays = 30) {
  try {
    if (!productId) throw new Error('productId is required');

    const windowStart = toDateOnlyString(addDays(new Date(), -lookbackDays));

    console.log(
      `[demandForecastService] Fetching forecast analytics for product ${productId} since ${windowStart}`
    );

    const { data, error } = await supabase
      .from('daily_demand_forecasts')
      .select('forecast_date, predicted_demand, actual_sales, algorithm_used')
      .eq('product_id', productId)
      .gte('forecast_date', windowStart)
      .order('forecast_date', { ascending: true });

    if (error) throw error;

    const history = (data || []).map((row) => ({
      date: row.forecast_date,
      predictedDemand: row.predicted_demand,
      actualSales: row.actual_sales,
      variance: (row.actual_sales || 0) - (row.predicted_demand || 0),
      algorithmUsed: row.algorithm_used,
    }));

    return { productId, lookbackDays, history };
  } catch (err) {
    console.error(`[demandForecastService] getForecastAnalytics failed for product ${productId}:`, err.message);
    throw err;
  }
}

/**
 * backfillActualSales(forecastDate)
 * Optional helper: once a forecast_date has passed, reconcile actual_sales
 * from completed orders for that calendar day. Not part of the original
 * requirements but useful for keeping getForecastAnalytics() meaningful.
 * Wire this into the same midnight cron (for yesterday's date) if desired.
 */
async function backfillActualSales(forecastDate) {
  try {
    const dayStart = new Date(`${forecastDate}T00:00:00.000Z`);
    const dayEnd = new Date(`${forecastDate}T23:59:59.999Z`);

    const { data: rows, error } = await supabase
      .from('daily_demand_forecasts')
      .select('id, product_id')
      .eq('forecast_date', forecastDate);

    if (error) throw error;

    for (const row of rows || []) {
      const { data: itemRows, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity, orders!inner(created_at, order_status)')
        .eq('product_id', row.product_id)
        .in('orders.order_status', COMPLETED_ORDER_STATUSES)
        .gte('orders.created_at', dayStart.toISOString())
        .lte('orders.created_at', dayEnd.toISOString());

      if (itemsError) {
        console.error(`[demandForecastService] backfillActualSales item fetch failed for product ${row.product_id}:`, itemsError.message);
        continue;
      }

      const actualSales = (itemRows || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

      const { error: updateError } = await supabase
        .from('daily_demand_forecasts')
        .update({ actual_sales: actualSales })
        .eq('id', row.id);

      if (updateError) {
        console.error(`[demandForecastService] backfillActualSales update failed for forecast ${row.id}:`, updateError.message);
      } else {
        console.log(`[demandForecastService] Backfilled actual_sales=${actualSales} for product ${row.product_id} on ${forecastDate}`);
      }
    }
  } catch (err) {
    console.error(`[demandForecastService] backfillActualSales failed for ${forecastDate}:`, err.message);
  }
}

// ---- Cron scheduling -------------------------------------------------

let cronInitialized = false;

/**
 * initializeForecastCron()
 * Registers the nightly midnight job. Call this ONCE from your server
 * bootstrap file (e.g. backend/src/server.js or app.js):
 *
 *   const { initializeForecastCron } = require('./services/demandForecastService');
 *   initializeForecastCron();
 */
function initializeForecastCron() {
  if (cronInitialized) {
    console.log('[demandForecastService] Cron already initialized, skipping duplicate registration');
    return;
  }

  // Runs every day at 12:00 AM (server local time)
  cron.schedule('0 0 * * *', async () => {
    const triggeredAt = new Date().toISOString();
    console.log(`[demandForecastService] ⏰ Midnight cron fired at ${triggeredAt}`);
    try {
      await runDailyForecastCron();

      // Optional: reconcile yesterday's actual sales while we're at it
      const yesterday = toDateOnlyString(addDays(new Date(), -1));
      await backfillActualSales(yesterday);
    } catch (err) {
      console.error('[demandForecastService] Midnight cron run failed:', err.message);
    }
  });

  cronInitialized = true;
  console.log('[demandForecastService] ✅ Midnight forecast cron scheduled (0 0 * * *)');
}

module.exports = {
  calculate3MDailySMA,
  calculateDayOfWeekSMA,
  runDailyForecastCron,
  get7DayForecastForProduct,
  getForecastAnalytics,
  backfillActualSales,
  initializeForecastCron,
};