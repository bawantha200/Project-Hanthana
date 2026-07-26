// frontend/src/services/reportService.js
import api from './api';

export async function getExpenseSummary(dateFrom, dateTo) {
  const response = await api.get('/reports/expense-summary', {
    params: { dateFrom, dateTo },
  });
  return response.data;
}

export async function getInvoiceReport(dateFrom, dateTo) {
  const response = await api.get('/invoices/report', {
    params: { dateFrom, dateTo },
  });
  return response.data;
}

export async function getPendingPayments() {
  const response = await api.get('/invoices/pending-payments');
  return response.data;
}

export async function getMonthlyRevenueHistory() {
  const response = await api.get('/invoices/monthly-revenue');
  return response.data;
}

export async function getMonthlyTrend(months, dataset) {
  const response = await api.get('/reports/monthly-trend', {
    params: { months, dataset },
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

export function getPeriodRange(period) {
  const now = new Date();

  if (period === 'last-month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
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

export const COMPARISON_PRESETS = [
  { value: 'month-vs-month', label: 'This Month vs Last Month' },
  { value: '3-vs-3', label: 'Last 3 Months vs Previous 3' },
  { value: '6-vs-6', label: 'Last 6 Months vs Previous 6' },
  { value: 'custom', label: 'Custom Range' },
];

// Returns { periodA, periodB } each as { dateFrom, dateTo }, for a given preset.
// Returns null for 'custom' — the caller supplies explicit dates in that case.
export function getComparisonRanges(preset) {
  const now = new Date();

  if (preset === 'month-vs-month') {
    return {
      periodA: getPeriodRange('this-month'),
      periodB: getPeriodRange('last-month'),
    };
  }

  if (preset === '3-vs-3' || preset === '6-vs-6') {
    const n = preset === '3-vs-3' ? 3 : 6;

    const aStartDate = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
    const aStart = aStartDate.toISOString().slice(0, 10);
    const aEnd = now.toISOString().slice(0, 10);

    const bEndDate = new Date(aStartDate.getFullYear(), aStartDate.getMonth(), 0);
    const bStartDate = new Date(bEndDate.getFullYear(), bEndDate.getMonth() - (n - 1), 1);
    const bStart = bStartDate.toISOString().slice(0, 10);
    const bEnd = bEndDate.toISOString().slice(0, 10);

    return {
      periodA: { dateFrom: aStart, dateTo: aEnd },
      periodB: { dateFrom: bStart, dateTo: bEnd },
    };
  }

  return null;
}