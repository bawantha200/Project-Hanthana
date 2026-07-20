// frontend/src/pages/Finance.jsx
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, 
  CreditCard, Truck, Package, Users, Receipt
} from 'lucide-react';
import RevenueChart from '../../components/RevenueChart';
import ExpenseChart from '../../components/ExpenseChart';
import StatCard from '../../components/StatCard';
import { financialData, expenseBreakdown } from '../../data/mockData';
import { formatCurrency } from '../../utils/helpers';

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

export default function Finance() {
  const navigate = useNavigate();

  const latestMonth = financialData[financialData.length - 1];
  const previousMonth = financialData[financialData.length - 2];
  const totalIncome = latestMonth.income;
  const totalExpenses = latestMonth.expenses;
  const netProfit = latestMonth.profit;
  const incomeGrowth = ((latestMonth.income - previousMonth.income) / previousMonth.income * 100).toFixed(1);
  const expenseGrowth = ((latestMonth.expenses - previousMonth.expenses) / previousMonth.expenses * 100).toFixed(1);
  const profitGrowth = ((latestMonth.profit - previousMonth.profit) / previousMonth.profit * 100).toFixed(1);

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
          onClick={() => navigate('/admin/finance/expenses')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          <Receipt size={16} />
          Manage Expenses
        </button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
        <StatCard
          title="Total Income"
          value={formatCurrency(totalIncome)}
          subtitle="vs last month"
          icon={DollarSign}
          trend="up"
          trendValue={`+${incomeGrowth}%`}
          color="blue"
          delay={0}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses)}
          subtitle="vs last month"
          icon={CreditCard}
          trend="up"
          trendValue={`+${expenseGrowth}%`}
          color="amber"
          delay={0.08}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(netProfit)}
          subtitle="vs last month"
          icon={TrendingUp}
          trend="up"
          trendValue={`+${profitGrowth}%`}
          color="emerald"
          delay={0.16}
        />
        <StatCard
          title="Pending Payments"
          value={formatCurrency(57900)}
          subtitle="outstanding dues"
          icon={CreditCard}
          color="rose"
          delay={0.24}
        />
      </motion.div>

      {/* Charts Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChart
          data={financialData}
          title="Monthly Profit Chart"
          subtitle="Income vs Expenses trend"
        />
        <ExpenseChart
          data={expenseBreakdown}
          title="Expense Breakdown"
          subtitle="Current month allocation"
        />
      </motion.div>

      {/* Expense Breakdown Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div variants={itemVariants} whileHover={{ y: -2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Truck size={18} className="text-blue-600" /></div>
            <div><h3 className="text-sm font-semibold text-gray-900">Vehicle Costs</h3><p className="text-xs text-gray-400">Fuel, maintenance & repairs</p></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(latestMonth.vehicleCosts)}</p>
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpRight size={14} className="text-rose-500" />
            <span className="text-xs font-medium text-rose-600">+{((latestMonth.vehicleCosts - previousMonth.vehicleCosts) / previousMonth.vehicleCosts * 100).toFixed(1)}%</span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${(latestMonth.vehicleCosts / latestMonth.expenses * 100).toFixed(0)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{(latestMonth.vehicleCosts / latestMonth.expenses * 100).toFixed(1)}% of total expenses</p>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><Users size={18} className="text-indigo-600" /></div>
            <div><h3 className="text-sm font-semibold text-gray-900">Salary Costs</h3><p className="text-xs text-gray-400">Base + OT + bonuses</p></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(latestMonth.salaryCosts)}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs font-medium text-gray-500">Stable</span>
            <span className="text-xs text-gray-400 ml-1">no change</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${(latestMonth.salaryCosts / latestMonth.expenses * 100).toFixed(0)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{(latestMonth.salaryCosts / latestMonth.expenses * 100).toFixed(1)}% of total expenses</p>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center"><Package size={18} className="text-cyan-600" /></div>
            <div><h3 className="text-sm font-semibold text-gray-900">Bottle Purchase Costs</h3><p className="text-xs text-gray-400">Sealed & empty bottles</p></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(latestMonth.bottleCosts)}</p>
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpRight size={14} className="text-rose-500" />
            <span className="text-xs font-medium text-rose-600">+{((latestMonth.bottleCosts - previousMonth.bottleCosts) / previousMonth.bottleCosts * 100).toFixed(1)}%</span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${(latestMonth.bottleCosts / latestMonth.expenses * 100).toFixed(0)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{(latestMonth.bottleCosts / latestMonth.expenses * 100).toFixed(1)}% of total expenses</p>
        </motion.div>
      </motion.div>

      {/* Revenue Growth & P&L Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-5">
            <div><h2 className="text-base font-semibold text-gray-900">Revenue Growth</h2><p className="text-xs text-gray-400 mt-0.5">Month-over-month income trend</p></div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp size={18} className="text-emerald-600" /></div>
          </div>
          <div className="space-y-4">
            {financialData.map((entry, idx) => {
              const growth = idx > 0 ? ((entry.income - financialData[idx - 1].income) / financialData[idx - 1].income * 100).toFixed(1) : 0;
              const isPositive = growth >= 0;
              return (
                <div key={entry.month} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-600 w-8">{entry.month}</span>
                  <div className="flex-1 min-w-0">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${(entry.income / 400000 * 100).toFixed(0)}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-24 text-right">{formatCurrency(entry.income)}</span>
                  {idx > 0 && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium w-16 justify-end ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
                      {isPositive ? '+' : ''}{growth}%
                    </span>
                  )}
                  {idx === 0 && <span className="w-16"></span>}
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-5">
            <div><h2 className="text-base font-semibold text-gray-900">Monthly P&L Summary</h2><p className="text-xs text-gray-400 mt-0.5">Profit and loss breakdown</p></div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><DollarSign size={18} className="text-blue-600" /></div>
          </div>
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
                {financialData.map((entry) => {
                  const margin = (entry.profit / entry.income * 100).toFixed(1);
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
                    {formatCurrency(financialData.reduce((s, r) => s + r.income, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900">
                    {formatCurrency(financialData.reduce((s, r) => s + r.expenses, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                    {formatCurrency(financialData.reduce((s, r) => s + r.profit, 0))}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      <TrendingUp size={10} />
                      {(financialData.reduce((s, r) => s + r.profit, 0) / financialData.reduce((s, r) => s + r.income, 0) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}