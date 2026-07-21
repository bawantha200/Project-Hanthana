// backend/src/utils/lowStockAlert.js
const supabase = require('../config/db');
const { sendNotificationEmails } = require('./mailer');

// එකම product එකකට alert emails දෙකක් අතර අවම gap එක (spam වළක්වන්න)
const ALERT_COOLDOWN_HOURS = 24;

/**
 * Single product එකක් low-stock threshold එකට වඩා අඩුද කියලා check කරලා,
 * අවශ්‍ය නම් (toggle on + cooldown ඉක්මවලා) staff alert එකක් යවනවා.
 * `addStock`/`reduceStock`/`updateStock` හැම එකකින්ම, stock update වුණාට
 * පස්සේ call කරන්න designed කරලා තියෙන්නේ (event-driven).
 */
async function checkAndAlertLowStock(productId) {
  try {
    // 1️⃣ Settings toggles check කරනවා
    const { data: notifSetting, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'notifications')
      .maybeSingle();

    if (settingsError) {
      console.error('❌ [lowStockAlert] Settings fetch error:', settingsError.message);
      return;
    }

    const settings = notifSetting?.value || {};
    if (settings.lowStockAlerts === false) {
      return; // toggle off — silently skip, event-driven path shouldn't be noisy
    }

    // 2️⃣ Inventory row එක fetch කරනවා (stock + threshold + last alert time)
    const { data: inventoryRow, error: invError } = await supabase
      .from('inventory')
      .select('current_stock, reorder_level, last_low_stock_alert_at')
      .eq('product_id', productId)
      .maybeSingle();

    if (invError) {
      console.error('❌ [lowStockAlert] Inventory fetch error:', invError.message);
      return;
    }
    if (!inventoryRow) return;

    const { current_stock, reorder_level, last_low_stock_alert_at } = inventoryRow;

    // Stock එක threshold එකට වඩා වැඩි නම්, කිසිම එකක් කරන්න ඕන නෑ
    if (current_stock > reorder_level) return;

    // 3️⃣ Cooldown check කරනවා (duplicate alerts වළක්වන්න)
    if (last_low_stock_alert_at) {
      const cooldownCutoff = Date.now() - ALERT_COOLDOWN_HOURS * 60 * 60 * 1000;
      if (new Date(last_low_stock_alert_at).getTime() >= cooldownCutoff) {
        return; // cooldown එකේ ඇතුලේ — skip
      }
    }

    // 4️⃣ Product නම fetch කරලා, alert එක යවනවා
    const { data: product } = await supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .maybeSingle();

    const productName = product?.name || `Product #${productId}`;
    const message = `Low stock alert: "${productName}" has ${current_stock} units left (reorder level: ${reorder_level}).`;

    // In-app notification row
    const { error: insertError } = await supabase.from('notifications').insert({
      target_role: 'CASHIER,ADMIN',
      type: 'inventory',
      message,
      related_order_id: null,
    });
    if (insertError) {
      console.error('❌ [lowStockAlert] Notification insert error:', insertError.message);
    }

    // Email channel (global emailNotifications toggle එකත් sendNotificationEmails ඇතුලෙන් respect වෙනවා නෑ —
    // මෙතන ම check කරනවා, mailer.js function එකට toggle-awareness නෑ නිසා)
    if (settings.emailNotifications !== false) {
      try {
        await sendNotificationEmails({
          targetRole: 'CASHIER,ADMIN',
          subject: `Low Stock: ${productName}`,
          message,
        });
      } catch (mailErr) {
        console.warn('⚠️ [lowStockAlert] Email failed:', mailErr.message);
      }
    }

    // 5️⃣ Cooldown timestamp update කරනවා
    const { error: updateError } = await supabase
      .from('inventory')
      .update({ last_low_stock_alert_at: new Date().toISOString() })
      .eq('product_id', productId);

    if (updateError) {
      console.error('❌ [lowStockAlert] Failed to update last_low_stock_alert_at:', updateError.message);
    } else {
      console.log(`📦 [lowStockAlert] Alert sent for "${productName}" (product #${productId}).`);
    }
  } catch (err) {
    // Alert fail වුණාට, stock update flow එකම fail වෙන්න එපා
    console.error('💥 [lowStockAlert] Unexpected error:', err);
  }
}

/**
 * Scheduled job එකෙන් call කරනවා — inventory row සියල්ලම loop කරලා,
 * threshold එකට වඩා අඩු ඒවා check කරනවා. Event-driven path එකකින්
 * miss වුණු ඒවා (e.g. direct DB edits) catch කරගන්න safety-net එකක්.
 */
async function checkAllLowStock() {
  console.log('⏰ [lowStockAlert] Running scheduled low-stock scan...');

  try {
    const { data: rows, error } = await supabase
      .from('inventory')
      .select('product_id, current_stock, reorder_level');

    if (error) {
      console.error('❌ [lowStockAlert] Scan query error:', error.message);
      return;
    }

    const lowStockRows = (rows || []).filter(
      (row) => row.current_stock <= row.reorder_level
    );

    if (lowStockRows.length === 0) {
      console.log('✅ [lowStockAlert] No products below reorder level.');
      return;
    }

    console.log(`📋 [lowStockAlert] ${lowStockRows.length} product(s) at/below reorder level.`);

    for (const row of lowStockRows) {
      await checkAndAlertLowStock(row.product_id);
    }

    console.log('✅ [lowStockAlert] Scheduled scan complete.');
  } catch (err) {
    console.error('💥 [lowStockAlert] Scheduled scan error:', err);
  }
}

module.exports = { checkAndAlertLowStock, checkAllLowStock };