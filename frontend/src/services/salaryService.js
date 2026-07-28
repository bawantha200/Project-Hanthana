// frontend/src/services/salaryService.js
import api from './api';

export async function markSalaryAsPaid(id) {
  const response = await api.patch(`/salaries/${id}/pay`);
  return normalizeSalary(response.data.data);
}

export async function getSalaries(filters = {}) {
  const params = {};
  if (filters.employeeId) params.employeeId = filters.employeeId;
  if (filters.month) params.month = filters.month;
  if (filters.paid !== undefined) params.paid = filters.paid;

  const response = await api.get('/salaries', { params });
  const rows = response.data?.data || [];
  return normalizeSalaryList(rows);
}

function normalizeSalary(row) {
  if (!row) return row;
  return {
    id: row.id,
    employeeName: row.employee_name,
    month: row.month,
    baseSalary: Number(row.base_salary),
    otHours: Number(row.ot_hours || 0),
    otAmount: Number(row.ot_amount || 0),
    bonus: Number(row.bonus || 0),
    totalSalary: Number(row.total_salary),
    paid: !!row.paid,
  };
}

function normalizeSalaryList(rows) {
  return (rows || []).map(normalizeSalary);
}