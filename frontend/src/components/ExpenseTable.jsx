import { ArrowUpDown, Pencil, Ban } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import { EXPENSE_CATEGORIES, getCategoryLabel } from '../services/expenseService';
export default function ExpenseTable({
  expenses,
  onEdit,
  onVoid,
  filterCategory,
  filterDateFrom,
  filterDateTo,
  searchQuery,
  onFilterChange,
  sortField,
  sortDirection,
  onSort,
}) {
  const handleSort = (field) => {
    if (sortField === field) {
      onSort(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  const updateFilter = (key, value) => {
    onFilterChange((prev) => ({ ...prev, [key]: value }));
  };

  const activeTotal = expenses
    .filter((exp) => exp.status !== 'voided')
    .reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterCategory}
          onChange={(e) => updateFilter('category', e.target.value)}
        >
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterDateFrom}
          onChange={(e) => updateFilter('dateFrom', e.target.value)}
          placeholder="From"
        />

        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterDateTo}
          onChange={(e) => updateFilter('dateTo', e.target.value)}
          placeholder="To"
        />

        <input
          type="text"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Search description..."
        />
      </div>

      {/* Table */}
      {expenses.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No expenses found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th
                  className="text-left py-3 px-4 font-semibold text-gray-600 cursor-pointer select-none"
                  onClick={() => handleSort('date')}
                >
                  <span className="inline-flex items-center gap-1">
                    Date <ArrowUpDown size={12} />
                  </span>
                </th>
                <th
                  className="text-left py-3 px-4 font-semibold text-gray-600 cursor-pointer select-none"
                  onClick={() => handleSort('category')}
                >
                  <span className="inline-flex items-center gap-1">
                    Category <ArrowUpDown size={12} />
                  </span>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Description</th>
                <th
                  className="text-right py-3 px-4 font-semibold text-gray-600 cursor-pointer select-none"
                  onClick={() => handleSort('amount')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Amount <ArrowUpDown size={12} />
                  </span>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => {
                const isVoided = exp.status === 'voided';
                return (
                  <tr
                    key={exp.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isVoided ? 'opacity-50' : ''}`}
                  >
                    <td className="py-3 px-4 text-gray-700">{exp.date}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {exp.description}
                      {isVoided && exp.voidReason && (
                        <p className="text-xs text-rose-500 mt-0.5">Voided: {exp.voidReason}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-4">
                      {isVoided ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          Voided
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(exp)}
                          disabled={isVoided}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onVoid(exp.id)}
                          disabled={isVoided}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Void"
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer total */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {expenses.filter((e) => e.status !== 'voided').length} active expense(s)
        </span>
        <span className="text-sm font-semibold text-gray-900">
          Total: {formatCurrency(activeTotal)}
        </span>
      </div>
    </div>
  );
}