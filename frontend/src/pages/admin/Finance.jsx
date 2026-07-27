// frontend/src/pages/Finance.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CreditCard, Truck, Package, Users, Receipt
} from 'lucide-react';
import RevenueChart from '../../components/RevenueChart';
import ExpenseChart from '../../components/ExpenseChart';
import StatCard from '../../components/StatCard';
import { formatCurrency } from '../../utils/helpers';
import { getExpenseSummary, getPeriodRange, getMonthlyTrend } from '../../services/reportService';

const API_BASE = 'http://localhost:5000/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const CATEGORY_COLORS = {
  VEHICLE: '#3b82f6',
  DELIVERY_COST: '#06b6d4',
  EMPTY_BOTTLE: '#f59e0b',
  OTHER: '#a855f7',
};
const VENDOR_COLOR = '#14b8a6';
const SALARY_COLOR = '#6366f1';

const TREND_MONTHS = 6;

function growthPct(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default function Finance() {
  const navigate = useNavigate();

  // --- Real income data, from the invoices report endpoint ---
  const [thisMonthRevenue, setThisMonthRevenue] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);

  // --- Real expense data ---
  const [thisMonthSummary, setThisMonthSummary] = useState(null);
  const [lastMonthSummary, setLastMonthSummary] = useState(null);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // --- Real combined monthly trend (income + expenses together) ---
  const [expenseTrend, setExpenseTrend] = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(true);

  const loadIncomeData = useCallback(async () => {
    setLoadingIncome(true);
    try {
      const thisRange = getPeriodRange('this-month');
      const lastRange = getPeriodRange('last-month');
      const [thisReport, lastReport, pendingData, monthlyData] = await Promise.all([
        fetch(
          `${API_BASE}/invoices/report?dateFrom=${thisRange.dateFrom}&dateTo=${thisRange.dateTo}`
        ).then((res) => res.json()),
        fetch(
          `${API_BASE}/invoices/report?dateFrom=${lastRange.dateFrom}&dateTo=${lastRange.dateTo}`
        ).then((res) => res.json()),
        fetch(`${API_BASE}/invoices/pending-payments`).then((res) => res.json()),
        fetch(`${API_BASE}/invoices/monthly-revenue`).then((res) => res.json()),
      ]);
      setThisMonthRevenue(thisReport.revenue || 0);
      setLastMonthRevenue(lastReport.revenue || 0);
      setPendingPayments(pendingData.pendingPayments || 0);
      setMonthlyRevenue(monthlyData || []);
    } catch (error) {
      console.error('Failed to load invoice revenue for dashboard:', error);
    } finally {
      setLoadingIncome(false);
    }
  }, []);

  const totalIncome = thisMonthRevenue;
  const incomeGrowth = growthPct(thisMonthRevenue, lastMonthRevenue).toFixed(1);

  const loadExpenseData = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const thisRange = getPeriodRange('this-month');
      const lastRange = getPeriodRange('last-month');
      const [thisData, lastData] = await Promise.all([
        getExpenseSummary(thisRange.dateFrom, thisRange.dateTo),
        getExpenseSummary(lastRange.dateFrom, lastRange.dateTo),
      ]);
      setThisMonthSummary(thisData);
      setLastMonthSummary(lastData);
    } catch (error) {
      console.error('Failed to load expense summary for dashboard:', error);
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  const loadTrendData = useCallback(async () => {
    setLoadingTrend(true);
    try {
      const data = await getMonthlyTrend(TREND_MONTHS, 'all');
      setExpenseTrend(data.trend || []);
    } catch (error) {
      console.error('Failed to load monthly trend for dashboard:', error);
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  useEffect(() => {
    loadIncomeData();
    loadExpenseData();
    loadTrendData();
  }, [loadIncomeData, loadExpenseData, loadTrendData]);

  // --- Derive real expense figures (default to 0 while loading) ---
  const s = thisMonthSummary;
  const p = lastMonthSummary;

  const realTotalExpenses = s?.grandTotal || 0;
  const prevTotalExpenses = p?.grandTotal || 0;

  const vehicleCosts = s?.otherExpenses.byCategory.VEHICLE || 0;
  const prevVehicleCosts = p?.otherExpenses.byCategory.VEHICLE || 0;

  const deliveryCosts = s?.otherExpenses.byCategory.DELIVERY_COST || 0;
  const emptyBottleCosts = s?.otherExpenses.byCategory.EMPTY_BOTTLE || 0;
  const otherCosts = s?.otherExpenses.byCategory.OTHER || 0;

  const vendorOrderCosts = s?.vendorExpenses.total || 0;
  const bottlePurchaseCosts = vendorOrderCosts + emptyBottleCosts;
  const prevBottlePurchaseCosts = (p?.vendorExpenses.total || 0) + (p?.otherExpenses.byCategory.EMPTY_BOTTLE || 0);

  const salaryCosts = s?.salaryExpenses.total || 0;
  const prevSalaryCosts = p?.salaryExpenses.total || 0;

  const netProfit = totalIncome - realTotalExpenses;
  const prevNetProfit = lastMonthRevenue - prevTotalExpenses;

  const loading = loadingIncome || loadingExpenses;

  const expenseGrowth = growthPct(realTotalExpenses, prevTotalExpenses).toFixed(1);
  const profitGrowth = growthPct(netProfit, prevNetProfit).toFixed(1);
  const vehicleGrowth = growthPct(vehicleCosts, prevVehicleCosts).toFixed(1);
  const salaryGrowth = growthPct(salaryCosts, prevSalaryCosts).toFixed(1);
  const bottleGrowth = growthPct(bottlePurchaseCosts, prevBottlePurchaseCosts).toFixed(1);

  const realExpenseBreakdown = [
    { name: 'Vehicle', value: vehicleCosts, color: CATEGORY_COLORS.VEHICLE },
    { name: 'Delivery', value: deliveryCosts, color: CATEGORY_COLORS.DELIVERY_COST },
    { name: 'Empty Bottle', value: emptyBottleCosts, color: CATEGORY_COLORS.EMPTY_BOTTLE },
    { name: 'Vendor Orders', value: vendorOrderCosts, color: VENDOR_COLOR },
    { name: 'Salary', value: salaryCosts, color: SALARY_COLOR },
    { name: 'Other', value: otherCosts, color: CATEGORY_COLORS.OTHER },
  ].filter((seg) => seg.value > 0);

  const pct = (part, whole) => (whole > 0 ? ((part / whole) * 100).toFixed(1) : '0.0');

  // --- Combine real income history with real expense trend into one dataset ---
  // expenseTrend is oldest-first, exactly TREND_MONTHS entries, from /reports/monthly-trend.
  // monthlyRevenue's exact ordering/length depends on invoiceService.getMonthlyRevenueHistory —
  // aligned here by position-from-the-end (most recent month matches most recent month),
  // so it stays correct even if the two histories start at different points.
  const combinedMonthly = expenseTrend.map((expEntry, idx) => {
    const distanceFromEnd = expenseTrend.length - idx;
    const incomeEntry = monthlyRevenue[monthlyRevenue.length - distanceFromEnd];
    const income = incomeEntry?.income || 0;
    return {
      month: expEntry.month,
      income,
      expenses: expEntry.total,
      profit: income - expEntry.total,
    };
  });

  const loadingChart = loading || loadingTrend;

  const goTo = (path) => () => navigate(path);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Financial overview — Income, expenses, and profit analysis
          </p>
        </div>
        <button
          onClick={() => navigate('/app/finance/expenses')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          <Receipt size={16} />
          Manage Expenses
        </button>
      </motion.div>

      {/* Summary Cards — each links to the page that explains it */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
        <div onClick={goTo('/app/finance/invoicing-reports')} className="cursor-pointer" title="View invoicing & revenue reports">
          <StatCard
            title="Total Income"
            value={loadingIncome ? '...' : formatCurrency(totalIncome)}
            subtitle="vs last month"
            icon={DollarSign}
            trend={incomeGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${incomeGrowth >= 0 ? '+' : ''}${incomeGrowth}%`}
            color="blue"
            delay={0}
          />
        </div>
        <div onClick={goTo('/app/finance/expenses')} className="cursor-pointer" title="Manage expenses">
          <StatCard
            title="Total Expenses"
            value={loadingExpenses ? '...' : formatCurrency(realTotalExpenses)}
            subtitle="vs last month"
            icon={CreditCard}
            trend={expenseGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${expenseGrowth >= 0 ? '+' : ''}${expenseGrowth}%`}
            color="amber"
            delay={0.08}
          />
        </div>
        <div onClick={goTo('/app/finance/expenses/compare?dataset=all')} className="cursor-pointer" title="Compare profit trends">
          <StatCard
            title="Net Profit"
            value={loading ? '...' : formatCurrency(netProfit)}
            subtitle="vs last month"
            icon={TrendingUp}
            trend={profitGrowth >= 0 ? 'up' : 'down'}
            trendValue={`${profitGrowth >= 0 ? '+' : ''}${profitGrowth}%`}
            color="emerald"
            delay={0.16}
          />
        </div>
        <div onClick={goTo('/app/finance/invoicing-reports')} className="cursor-pointer" title="View pending invoices">
          <StatCard
            title="Pending Payments"
            value={loadingIncome ? '...' : formatCurrency(pendingPayments)}
            subtitle="outstanding dues"
            icon={CreditCard}
            color="rose"
            delay={0.24}
          />
        </div>
      </motion.div>

      {/* Charts Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loadingChart ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <RevenueChart
            data={combinedMonthly}
            title="Monthly Profit Chart"
            subtitle={`Income vs Expenses trend — last ${TREND_MONTHS} months, real data`}
          />
        )}
        {loadingExpenses ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <ExpenseChart
            data={realExpenseBreakdown}
            title="Expense Breakdown"
            subtitle="Current month allocation — real data"
          />
        )}
      </motion.div>

      {/* Expense Breakdown Cards — real data, each links to its comparison view */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          onClick={goTo('/app/finance/expenses/compare?dataset=other')}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Truck size={18} className="text-blue-600" /></div>
            <div><h3 className="text-sm font-semibold text-gray-900">Vehicle Costs</h3><p className="text-xs text-gray-400">Fuel, maintenance & repairs</p></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loadingExpenses ? '...' : formatCurrency(vehicleCosts)}</p>
          <div className="flex items-center gap-1 mt-2">
            {vehicleGrowth >= 0 ? <ArrowUpRight size={14} className="text-rose-500" /> : <ArrowDownRight size={14} className="text-emerald-500" />}
            <span className={`text-xs font-medium ${vehicleGrowth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{vehicleGrowth >= 0 ? '+' : ''}{vehicleGrowth}%</span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct(vehicleCosts, realTotalExpenses)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pct(vehicleCosts, realTotalExpenses)}% of total expenses</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          onClick={goTo('/app/finance/expenses/compare?dataset=salary')}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><Users size={18} className="text-indigo-600" /></div>
            <div><h3 className="text-sm font-semibold text-gray-900">Salary Costs</h3><p className="text-xs text-gray-400">Base + OT + bonuses</p></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loadingExpenses ? '...' : formatCurrency(salaryCosts)}</p>
          <div className="flex items-center gap-1 mt-2">
            {salaryGrowth >= 0 ? <ArrowUpRight size={14} className="text-rose-500" /> : <ArrowDownRight size={14} className="text-emerald-500" />}
            <span className={`text-xs font-medium ${salaryGrowth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{salaryGrowth >= 0 ? '+' : ''}{salaryGrowth}%</span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct(salaryCosts, realTotalExpenses)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pct(salaryCosts, realTotalExpenses)}% of total expenses</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          onClick={goTo('/app/finance/expenses/compare?dataset=vendor')}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center"><Package size={18} className="text-cyan-600" /></div>
            <div><h3 className="text-sm font-semibold text-gray-900">Bottle Purchase Costs</h3><p className="text-xs text-gray-400">Vendor orders & empty bottles</p></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loadingExpenses ? '...' : formatCurrency(bottlePurchaseCosts)}</p>
          <div className="flex items-center gap-1 mt-2">
            {bottleGrowth >= 0 ? <ArrowUpRight size={14} className="text-rose-500" /> : <ArrowDownRight size={14} className="text-emerald-500" />}
            <span className={`text-xs font-medium ${bottleGrowth >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{bottleGrowth >= 0 ? '+' : ''}{bottleGrowth}%</span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${pct(bottlePurchaseCosts, realTotalExpenses)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{pct(bottlePurchaseCosts, realTotalExpenses)}% of total expenses</p>
        </motion.div>
      </motion.div>

      {/* Revenue Growth & P&L Summary — now real, from combined income + expense trend */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-5">
            <div><h2 className="text-base font-semibold text-gray-900">Revenue Growth</h2><p className="text-xs text-gray-400 mt-0.5">Month-over-month income trend</p></div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp size={18} className="text-emerald-600" /></div>
          </div>
          {loadingChart ? (
            <div className="flex items-center justify-center py-10">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const maxIncome = Math.max(...combinedMonthly.map((e) => e.income), 1);
                return combinedMonthly.map((entry, idx) => {
                  const prev = idx > 0 ? combinedMonthly[idx - 1].income : null;
                  const growth = prev ? (((entry.income - prev) / prev) * 100).toFixed(1) : null;
                  const isPositive = growth === null || growth >= 0;
                  return (
                    <div key={`${entry.month}-${idx}`} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-600 w-16">{entry.month}</span>
                      <div className="flex-1 min-w-0">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-600"
                            style={{ width: `${((entry.income / maxIncome) * 100).toFixed(0)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-24 text-right">{formatCurrency(entry.income)}</span>
                      {growth !== null ? (
                        <span className={`flex items-center gap-0.5 text-xs font-medium w-16 justify-end ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
                          {isPositive ? '+' : ''}{growth}%
                        </span>
                      ) : (
                        <span className="w-16"></span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-5">
            <div><h2 className="text-base font-semibold text-gray-900">Monthly P&L Summary</h2><p className="text-xs text-gray-400 mt-0.5">Profit and loss breakdown — real data</p></div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><DollarSign size={18} className="text-blue-600" /></div>
          </div>
          {loadingChart ? (
            <div className="flex items-center justify-center py-10">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedMonthly.map((entry) => {
                    const margin = entry.income > 0 ? ((entry.profit / entry.income) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={entry.month} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3 font-medium text-gray-700">{entry.month}</td>
                        <td className="py-3 px-3 text-right text-gray-600">{formatCurrency(entry.income)}</td>
                        <td className="py-3 px-3 text-right text-gray-600">{formatCurrency(entry.expenses)}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-semibold ${entry.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(entry.profit)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${entry.profit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {entry.profit >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50/50">
                    <td className="py-3 px-3 font-semibold text-gray-900">Total</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">
                      {formatCurrency(combinedMonthly.reduce((sum, r) => sum + r.income, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">
                      {formatCurrency(combinedMonthly.reduce((sum, r) => sum + r.expenses, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(combinedMonthly.reduce((sum, r) => sum + r.profit, 0))}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {(() => {
                        const totalIncomeSum = combinedMonthly.reduce((sum, r) => sum + r.income, 0);
                        const totalProfitSum = combinedMonthly.reduce((sum, r) => sum + r.profit, 0);
                        const totalMargin = totalIncomeSum > 0 ? ((totalProfitSum / totalIncomeSum) * 100).toFixed(1) : '0.0';
                        return (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            <TrendingUp size={10} />
                            {totalMargin}%
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}