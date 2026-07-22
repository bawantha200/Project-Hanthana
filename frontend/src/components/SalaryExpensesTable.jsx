import { formatCurrency } from '../utils/helpers';
import PeriodSelector from './PeriodSelector';

export default function SalaryExpensesTable({ salaries, filters, onFilterChange }) {
  const updateFilter = (partial) => {
    onFilterChange((prev) => ({ ...prev, ...partial }));
  };

  const total = salaries.reduce((sum, s) => sum + s.totalSalary, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
        <PeriodSelector
          period={filters.period}
          onPeriodChange={(period) => updateFilter({ period })}
          customFrom={filters.customFrom}
          customTo={filters.customTo}
          onCustomFromChange={(customFrom) => updateFilter({ customFrom })}
          onCustomToChange={(customTo) => updateFilter({ customTo })}
        />

        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.paid}
          onChange={(e) => updateFilter({ paid: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="true">Paid</option>
          <option value="false">Pending</option>
        </select>

        <input
          type="text"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[160px]"
          value={filters.search}
          onChange={(e) => updateFilter({ search: e.target.value })}
          placeholder="Search employee..."
        />
      </div>

      {salaries.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No salary records found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Employee</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Month</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Base</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">OT</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Bonus</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Total</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{s.employeeName}</td>
                  <td className="py-3 px-4 text-gray-700">{s.month}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(s.baseSalary)}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(s.otAmount)}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(s.bonus)}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(s.totalSalary)}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {s.paid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">{salaries.length} record(s)</span>
        <span className="text-sm font-semibold text-gray-900">Total: {formatCurrency(total)}</span>
      </div>
    </div>
  );
}