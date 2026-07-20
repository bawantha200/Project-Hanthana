// frontend/src/services/reportService.js
import api from './api';

export async function getExpenseSummary(dateFrom, dateTo) {
  const response = await api.get('/reports/expense-summary', {
    params: { dateFrom, dateTo },
  });
  return response.data;
}

// Helper to compute date ranges for common report periods.
export function getPeriodRange(period) {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const from = new Date(now);

  if (period === 'this-month') {
    from.setDate(1);
  } else if (period === '6-months') {
    from.setMonth(from.getMonth() - 5);
    from.setDate(1);
  } else if (period === '1-year') {
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
  }

  const dateFrom = from.toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}