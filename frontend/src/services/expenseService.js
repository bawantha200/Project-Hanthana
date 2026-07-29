// frontend/src/services/expenseService.js
import api from './api';

export const EXPENSE_CATEGORIES = [
  { value: 'VEHICLE', label: 'Vehicle Costs' },
  { value: 'DELIVERY_COST', label: 'Delivery Cost' },
  { value: 'UTILITY', label: 'Utility Expenses' },
  { value: 'MAINTENANCE', label: 'Maintenance & Repairs' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'ADVERTISING', label: 'Advertising' },
  { value: 'OTHER', label: 'Other' },
];

export function getCategoryLabel(value) {
  const match = EXPENSE_CATEGORIES.find((c) => c.value === value);
  return match ? match.label : value;
}

export async function getExpenses(filters = {}) {
  const params = {};
  if (filters.category) params.category = filters.category;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.search) params.search = filters.search;

  const response = await api.get('/expenses', { params });
  return normalizeExpenseList(response.data);
}

export async function addExpense(expense) {
  const response = await api.post('/expenses', expense);
  return normalizeExpense(response.data);
}

export async function updateExpense(id, updatedFields) {
  const response = await api.put(`/expenses/${id}`, updatedFields);
  return normalizeExpense(response.data);
}

export async function voidExpense(id, reason) {
  const response = await api.patch(`/expenses/${id}/void`, { reason });
  return normalizeExpense(response.data);
}

// --- Helpers: convert Supabase rows into the shape the frontend components expect

function normalizeExpense(row) {
  if (!row) return row;
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    date: row.recorded_at ? row.recorded_at.slice(0, 10) : '',
    recordedBy: row.recorded_by || null,
    status: row.voided ? 'voided' : 'active',
    voidReason: row.void_reason || null,
  };
}

function normalizeExpenseList(rows) {
  return (rows || []).map(normalizeExpense);
}