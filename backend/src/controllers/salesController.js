const {
  getOrderStats,
  getDeliveryStats,
  getRiderWorkload,
  getMessageStats,
  getRecentOrders,
  getRecentMessages,
} = require('../services/salesService');

const getSalesManagerDashboard = async (req, res) => {
  try {
    const [orderStats, deliveryStats, riderWorkload, messageStats, recentOrders, recentMessages] =
      await Promise.all([
        getOrderStats(),
        getDeliveryStats(),
        getRiderWorkload(),
        getMessageStats(),
        getRecentOrders(5),
        getRecentMessages(5),
      ]);

    res.json({
      success: true,
      orderStats,
      deliveryStats,
      riderWorkload,
      messageStats,
      recentOrders,
      recentMessages,
    });
  } catch (err) {
    console.error('[getSalesManagerDashboard] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getSalesManagerDashboard };