// frontend/src/services/reportService.js
import api from './api';

export async function getExpenseSummary(dateFrom, dateTo) {
  const response = await api.get('/reports/expense-summary', {
    params: { dateFrom, dateTo },
  });
  return response.data;
}

export const PERIOD_OPTIONS = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: '6-months', label: 'Last 6 Months' },
  { value: '12-months', label: 'Last 12 Months' },
  { value: 'custom', label: 'Custom Range' },
];

// Computes a { dateFrom, dateTo } range for a preset period key.
// 'custom' is not handled here — the caller supplies explicit dates for that case.
export function getPeriodRange(period) {
  const now = new Date();

  if (period === 'last-month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
    return {
      dateFrom: from.toISOString().slice(0, 10),
      dateTo: to.toISOString().slice(0, 10),
    };
  }

  const dateTo = now.toISOString().slice(0, 10);
  const from = new Date(now);

  if (period === 'this-month') {
    from.setDate(1);
  } else if (period === '6-months') {
    from.setMonth(from.getMonth() - 5);
    from.setDate(1);
  } else if (period === '12-months') {
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
  }

  return { dateFrom: from.toISOString().slice(0, 10), dateTo };
}

// Converts a date range into "July 2026" style labels, matching the
// free-text `month` column in the salaries table.
export function getMonthLabelsInRange(dateFrom, dateTo) {
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