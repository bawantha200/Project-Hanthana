// controllers/reportController.js
const supabase = require('../config/db');

// Converts a date range into "July 2026" style labels to match
// the free-text `month` column in the salaries table.
function getMonthLabelsInRange(dateFrom, dateTo) {
  const labels = [];
  const cursor = new Date(dateFrom);
  cursor.setDate(1);
  const end = new Date(dateTo);
  end.setDate(1);

  while (cursor <= end) {
    labels.push(cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return labels;
}

const reportController = {
  async getExpenseSummary(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'dateFrom and dateTo are required' });
      }

      // --- Other expenses (manual entries, already excludes SALARY category) ---
      const { data: otherExpenses, error: otherError } = await supabase
        .from('expenses')
        .select('*')
        .neq('category', 'SALARY')
        .eq('voided', false)
        .gte('recorded_at', dateFrom)
        .lte('recorded_at', dateTo);

      if (otherError) throw otherError;

      const otherByCategory = {};
      let otherTotal = 0;
      for (const exp of otherExpenses) {
        const amt = Number(exp.amount);
        otherTotal += amt;
        otherByCategory[exp.category] = (otherByCategory[exp.category] || 0) + amt;
      }

      // --- Vendor order expenses (excludes cancelled) ---
      const { data: vendorOrders, error: vendorError } = await supabase
        .from('vendor_orders')
        .select('total, status, order_date')
        .neq('status', 'cancelled')
        .gte('order_date', dateFrom)
        .lte('order_date', dateTo);

      if (vendorError) throw vendorError;

      const vendorTotal = vendorOrders.reduce((sum, o) => sum + Number(o.total), 0);

      // --- Salary expenses (matched by month label) ---
      const monthLabels = getMonthLabelsInRange(dateFrom, dateTo);
      const { data: salaries, error: salaryError } = await supabase
        .from('salaries')
        .select('total_salary, month')
        .in('month', monthLabels);

      if (salaryError) throw salaryError;

      const salaryTotal = salaries.reduce((sum, s) => sum + Number(s.total_salary), 0);

      const grandTotal = otherTotal + vendorTotal + salaryTotal;

      res.status(200).json({
        period: { dateFrom, dateTo },
        otherExpenses: {
          total: otherTotal,
          byCategory: otherByCategory,
          count: otherExpenses.length,
        },
        vendorExpenses: {
          total: vendorTotal,
          count: vendorOrders.length,
        },
        salaryExpenses: {
          total: salaryTotal,
          count: salaries.length,
          monthsIncluded: monthLabels,
        },
        grandTotal,
      });
    } catch (error) {
      console.error('Error generating expense summary:', error);
      res.status(500).json({ error: 'Failed to generate expense report' });
    }
  },
};

module.exports = { reportController };