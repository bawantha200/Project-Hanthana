import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/helpers';
import { getCategoryLabel } from '../../services/expenseService';
import {
  getExpenseSummary,
  getMonthlyTrend,
  COMPARISON_PRESETS,
  getComparisonRanges,
} from '../../services/reportService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const DATASET_TABS = [
  { value: 'all', label: 'All Combined' },
  { value: 'other', label: 'Other Expenses' },
  { value: 'vendor', label: 'Vendor Orders' },
  { value: 'salary', label: 'Salary Expenses' },
];

const TREND_MONTH_OPTIONS = [3, 6, 12];

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function ChangeBadge({ pct }) {
  const isFlat = Math.abs(pct) < 0.05;
  const isUp = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        isFlat
          ? 'bg-gray-100 text-gray-500'
          : isUp
          ? 'bg-rose-50 text-rose-700'
          : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      {isFlat ? <Minus size={12} /> : isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {isFlat ? '0.0' : `${isUp ? '+' : ''}${pct.toFixed(1)}`}%
    </span>
  );
}

export default function ExpenseComparison() {
  const navigate = useNavigate();

  const [dataset, setDataset] = useState('all');

  // --- Comparison state ---
  const [preset, setPreset] = useState('month-vs-month');
  const [customA, setCustomA] = useState({ from: '', to: '' });
  const [customB, setCustomB] = useState({ from: '', to: '' });
  const [comparison, setComparison] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState('');

  // --- Trend state ---
  const [trendMonths, setTrendMonths] = useState(6);
  const [customMonths, setCustomMonths] = useState('');
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const runComparison = useCallback(async () => {
    let periodA, periodB;

    if (preset === 'custom') {
      if (!customA.from || !customA.to || !customB.from || !customB.to) {
        setComparisonError('Please fill in both custom date ranges');
        return;
      }
      periodA = { dateFrom: customA.from, dateTo: customA.to };
      periodB = { dateFrom: customB.from, dateTo: customB.to };
    } else {
      const ranges = getComparisonRanges(preset);
      periodA = ranges.periodA;
      periodB = ranges.periodB;
    }

    setComparisonError('');
    setComparisonLoading(true);
    try {
      const [dataA, dataB] = await Promise.all([
        getExpenseSummary(periodA.dateFrom, periodA.dateTo),
        getExpenseSummary(periodB.dateFrom, periodB.dateTo),
      ]);
      setComparison({ periodA: dataA, periodB: dataB });
    } catch (error) {
      console.error('Failed to load comparison:', error);
      setComparisonError('Failed to load comparison data.');
    } finally {
      setComparisonLoading(false);
    }
  }, [preset, customA, customB]);

  useEffect(() => {
    if (preset !== 'custom') {
      runComparison();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const loadTrend = useCallback(async (months) => {
    setTrendLoading(true);
    try {
      const data = await getMonthlyTrend(months, dataset);
      setTrendData(data.trend);
    } catch (error) {
      console.error('Failed to load trend:', error);
    } finally {
      setTrendLoading(false);
    }
  }, [dataset]);

  useEffect(() => {
    loadTrend(trendMonths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, trendMonths]);

  const applyCustomMonths = () => {
    const n = parseInt(customMonths, 10);
    if (n > 0 && n <= 36) {
      setTrendMonths(n);
    }
  };

  // --- Derive totals for the selected dataset from the comparison payload ---
  const totals = useMemo(() => {
    if (!comparison) return null;
    const a = comparison.periodA;
    const b = comparison.periodB;

    if (dataset === 'other') {
      return { totalA: a.otherExpenses.total, totalB: b.otherExpenses.total };
    }
    if (dataset === 'vendor') {
      return { totalA: a.vendorExpenses.total, totalB: b.vendorExpenses.total };
    }
    if (dataset === 'salary') {
      return { totalA: a.salaryExpenses.total, totalB: b.salaryExpenses.total };
    }
    return { totalA: a.grandTotal, totalB: b.grandTotal };
  }, [comparison, dataset]);

  // --- Breakdown answering "which category caused the change" ---
  const breakdown = useMemo(() => {
    if (!comparison) return [];
    const a = comparison.periodA;
    const b = comparison.periodB;

    if (dataset === 'other') {
      const categories = new Set([
        ...Object.keys(a.otherExpenses.byCategory),
        ...Object.keys(b.otherExpenses.byCategory),
      ]);
      return Array.from(categories).map((cat) => ({
        label: getCategoryLabel(cat),
        valueA: a.otherExpenses.byCategory[cat] || 0,
        valueB: b.otherExpenses.byCategory[cat] || 0,
      }));
    }

    if (dataset === 'all') {
      return [
        { label: 'Other Expenses', valueA: a.otherExpenses.total, valueB: b.otherExpenses.total },
        { label: 'Vendor Orders', valueA: a.vendorExpenses.total, valueB: b.vendorExpenses.total },
        { label: 'Salary', valueA: a.salaryExpenses.total, valueB: b.salaryExpenses.total },
      ];
    }

    return []; // vendor / salary: no sub-breakdown, per decision
  }, [comparison, dataset]);

  const maxBreakdownValue = Math.max(1, ...breakdown.flatMap((b) => [b.valueA, b.valueB]));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => navigate('/admin/finance/expenses')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft size={14} />
          Back to Expense Management
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Expense Comparison & Trends</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compare spending across periods and see how it trends over time
        </p>
      </motion.div>

      {/* Dataset tabs */}
      <motion.div variants={itemVariants} className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit flex-wrap">
        {DATASET_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setDataset(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              dataset === tab.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Comparison section */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Period Comparison</h2>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          {COMPARISON_PRESETS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPreset(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                preset === opt.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Period A</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1"
                  value={customA.from}
                  onChange={(e) => setCustomA((p) => ({ ...p, from: e.target.value }))}
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1"
                  value={customA.to}
                  onChange={(e) => setCustomA((p) => ({ ...p, to: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Period B</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1"
                  value={customB.from}
                  onChange={(e) => setCustomB((p) => ({ ...p, from: e.target.value }))}
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1"
                  value={customB.to}
                  onChange={(e) => setCustomB((p) => ({ ...p, to: e.target.value }))}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <button
                onClick={runComparison}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Compare
              </button>
            </div>
          </div>
        )}

        {comparisonError && <p className="text-xs text-rose-600 mb-3">{comparisonError}</p>}

        {comparisonLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : totals ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Period A</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.totalA)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Period B</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.totalB)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-600 mb-1">Change</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-blue-900">
                    {formatCurrency(totals.totalA - totals.totalB)}
                  </p>
                  <ChangeBadge pct={pctChange(totals.totalA, totals.totalB)} />
                </div>
              </div>
            </div>

            {breakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Which {dataset === 'all' ? 'expense type' : 'category'} changed the most
                </h3>
                <div className="space-y-3">
                  {breakdown
                    .sort((x, y) => Math.abs(y.valueA - y.valueB) - Math.abs(x.valueA - x.valueB))
                    .map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{formatCurrency(item.valueB)} → {formatCurrency(item.valueA)}</span>
                            <ChangeBadge pct={pctChange(item.valueA, item.valueB)} />
                          </div>
                        </div>
                        <div className="flex gap-1 h-2">
                          <div
                            className="bg-gray-300 rounded-full"
                            style={{ width: `${(item.valueB / maxBreakdownValue) * 100}%` }}
                          />
                          <div
                            className="bg-blue-500 rounded-full"
                            style={{ width: `${(item.valueA / maxBreakdownValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Gray = Period B &nbsp;•&nbsp; Blue = Period A</p>
              </div>
            )}
          </>
        ) : null}
      </motion.div>

      {/* Trend section */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-base font-semibold text-gray-900">Spending Trend</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {TREND_MONTH_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setTrendMonths(n)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  trendMonths === n ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {n} months
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="36"
              placeholder="Custom"
              className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              value={customMonths}
              onChange={(e) => setCustomMonths(e.target.value)}
            />
            <button
              onClick={applyCustomMonths}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>

        {trendLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </motion.div>
  );
}