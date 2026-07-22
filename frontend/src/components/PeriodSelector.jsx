import { PERIOD_OPTIONS } from '../services/reportService';

export default function PeriodSelector({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {period === 'custom' && (
        <>
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
          />
        </>
      )}
    </div>
  );
}