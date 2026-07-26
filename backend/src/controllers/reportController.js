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

// Returns month boundaries for the last n months (oldest first), each with
// a short label for charts and a full label to match the salaries table.
function getMonthRanges(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    months.push({
      label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      fullLabel: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
  }
  return months;
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

  async getMonthlyTrend(req, res) {
    try {
      const months = parseInt(req.query.months, 10) || 6;
      const dataset = req.query.dataset || 'all'; // all | other | vendor | salary

      const ranges = getMonthRanges(months);
      const earliestDate = ranges[0].startDate;
      const latestDate = ranges[ranges.length - 1].endDate;

      let otherRows = [];
      let vendorRows = [];
      let salaryRows = [];

      if (dataset === 'all' || dataset === 'other') {
        const { data, error } = await supabase
          .from('expenses')
          .select('amount, recorded_at')
          .neq('category', 'SALARY')
          .eq('voided', false)
          .gte('recorded_at', earliestDate)
          .lte('recorded_at', latestDate);
        if (error) throw error;
        otherRows = data;
      }

      if (dataset === 'all' || dataset === 'vendor') {
        const { data, error } = await supabase
          .from('vendor_orders')
          .select('total, order_date')
          .neq('status', 'cancelled')
          .gte('order_date', earliestDate)
          .lte('order_date', latestDate);
        if (error) throw error;
        vendorRows = data;
      }

      if (dataset === 'all' || dataset === 'salary') {
        const labels = ranges.map((r) => r.fullLabel);
        const { data, error } = await supabase
          .from('salaries')
          .select('total_salary, month')
          .in('month', labels);
        if (error) throw error;
        salaryRows = data;
      }

      const trend = ranges.map((r) => {
        const otherTotal = otherRows
          .filter((x) => x.recorded_at >= r.startDate && x.recorded_at <= r.endDate)
          .reduce((s, x) => s + Number(x.amount), 0);
        const vendorTotal = vendorRows
          .filter((x) => x.order_date >= r.startDate && x.order_date <= r.endDate)
          .reduce((s, x) => s + Number(x.total), 0);
        const salaryTotal = salaryRows
          .filter((x) => x.month === r.fullLabel)
          .reduce((s, x) => s + Number(x.total_salary), 0);

        let value;
        if (dataset === 'other') value = otherTotal;
        else if (dataset === 'vendor') value = vendorTotal;
        else if (dataset === 'salary') value = salaryTotal;
        else value = otherTotal + vendorTotal + salaryTotal;

        return { month: r.label, total: value };
      });

      res.status(200).json({ dataset, months, trend });
    } catch (error) {
      console.error('Error generating monthly trend:', error);
      res.status(500).json({ error: 'Failed to generate monthly trend' });
    }
  },
  
};

module.exports = { reportController };