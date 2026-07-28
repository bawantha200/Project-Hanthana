import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Truck, Users, FileText, Receipt, BarChart3, ClipboardList } from 'lucide-react';
import ExpenseTable from '../../components/ExpenseTable';
import ExpenseFormModal from '../../components/ExpenseFormModal';
import VoidConfirmationModal from '../../components/VoidConfirmationModal';
import VendorExpensesTable from '../../components/VendorExpensesTable';
import SalaryExpensesTable from '../../components/SalaryExpensesTable';
import PeriodSelector from '../../components/PeriodSelector';
import GenerateReportModal from '../../components/GenerateReportModal';
import {
  getExpenses,
  addExpense,
  updateExpense,
  voidExpense,
} from '../../services/expenseService';
import { getVendorOrders } from '../../services/vendorOrdersService';
import { getSalaries } from '../../services/salaryService';
import { getPeriodRange, getMonthLabelsInRange } from '../../services/reportService';

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

const DEFAULT_FILTERS = {
  period: 'this-month',
  customFrom: '',
  customTo: '',
};

function isWithinRange(dateStr, dateFrom, dateTo) {
  if (!dateStr) return false;
  if (dateFrom && dateStr < dateFrom) return false;
  if (dateTo && dateStr > dateTo) return false;
  return true;
}

function getEffectiveRange(filters) {
  if (filters.period === 'custom') {
    if (!filters.customFrom || !filters.customTo) return null;
    return { dateFrom: filters.customFrom, dateTo: filters.customTo };
  }
  return getPeriodRange(filters.period);
}

export default function ExpenseManagement() {
  const navigate = useNavigate();

  // --- Raw data (fetched once, unbounded) ---
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [salaries, setSalaries] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // --- Per-table filters ---
  const [expenseFilters, setExpenseFilters] = useState({ ...DEFAULT_FILTERS, category: '', search: '', status: 'active' });
  const [vendorFilters, setVendorFilters] = useState({ ...DEFAULT_FILTERS, status: '', search: '' });
  const [salaryFilters, setSalaryFilters] = useState({ ...DEFAULT_FILTERS, paid: '', search: '' });
  const [sort, setSort] = useState({ field: 'date', direction: 'desc' });

  // --- Global "apply to all" period control ---
  const [globalPeriod, setGlobalPeriod] = useState('this-month');
  const [globalCustomFrom, setGlobalCustomFrom] = useState('');
  const [globalCustomTo, setGlobalCustomTo] = useState('');

  const applyGlobalPeriod = () => {
    const patch = { period: globalPeriod, customFrom: globalCustomFrom, customTo: globalCustomTo };
    setExpenseFilters((prev) => ({ ...prev, ...patch }));
    setVendorFilters((prev) => ({ ...prev, ...patch }));
    setSalaryFilters((prev) => ({ ...prev, ...patch }));
  };

  // --- Modal states ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [activeReportType, setActiveReportType] = useState(null); // null | 'summary' | 'other' | 'vendor' | 'salary' | 'full'
  const [editingExpense, setEditingExpense] = useState(null);
  const [voidingExpenseId, setVoidingExpenseId] = useState(null);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- Loaders ---
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVendorOrders = useCallback(async () => {
    setVendorLoading(true);
    try {
      const data = await getVendorOrders();
      setVendorOrders(data);
    } catch (error) {
      console.error('Failed to load vendor orders:', error);
    } finally {
      setVendorLoading(false);
    }
  }, []);

  const loadSalaries = useCallback(async () => {
    setSalaryLoading(true);
    try {
      const data = await getSalaries();
      setSalaries(data);
    } catch (error) {
      console.error('Failed to load salaries:', error);
    } finally {
      setSalaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
    loadVendorOrders();
    loadSalaries();
  }, [loadExpenses, loadVendorOrders, loadSalaries]);

  // --- Filtered datasets ---
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (expenseFilters.category) {
      result = result.filter((exp) => exp.category === expenseFilters.category);
    }
    if (expenseFilters.search) {
      const q = expenseFilters.search.toLowerCase();
      result = result.filter((exp) => exp.description.toLowerCase().includes(q));
    }
    if (expenseFilters.status === 'active') {
      result = result.filter((exp) => exp.status !== 'voided');
    } else if (expenseFilters.status === 'voided') {
      result = result.filter((exp) => exp.status === 'voided');
    }
    const range = getEffectiveRange(expenseFilters);
    if (range) {
      result = result.filter((exp) => isWithinRange(exp.date, range.dateFrom, range.dateTo));
    }

    if (sort.field) {
      result.sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        if (typeof aVal === 'string') {
          return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [expenses, expenseFilters, sort]);

  const filteredVendorOrders = useMemo(() => {
    let result = [...vendorOrders];

    if (vendorFilters.status) {
      result = result.filter((o) => o.status === vendorFilters.status);
    }
    if (vendorFilters.search) {
      const q = vendorFilters.search.toLowerCase();
      result = result.filter(
        (o) => o.vendorName.toLowerCase().includes(q) || o.productName.toLowerCase().includes(q)
      );
    }
    const range = getEffectiveRange(vendorFilters);
    if (range) {
      result = result.filter((o) => isWithinRange(o.orderDate, range.dateFrom, range.dateTo));
    }

    return result;
  }, [vendorOrders, vendorFilters]);

  const filteredSalaries = useMemo(() => {
    let result = [...salaries];

    if (salaryFilters.paid !== '') {
      const wantPaid = salaryFilters.paid === 'true';
      result = result.filter((s) => s.paid === wantPaid);
    }
    if (salaryFilters.search) {
      const q = salaryFilters.search.toLowerCase();
      result = result.filter((s) => s.employeeName.toLowerCase().includes(q));
    }
    const range = getEffectiveRange(salaryFilters);
    if (range) {
      const monthLabels = getMonthLabelsInRange(range.dateFrom, range.dateTo);
      result = result.filter((s) => monthLabels.includes(s.month));
    }

    return result;
  }, [salaries, salaryFilters]);

  // --- Handlers ---
  const handleAddExpense = async (expenseData) => {
    try {
      const newExpense = await addExpense(expenseData);
      setExpenses((prev) => [newExpense, ...prev]);
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const handleEditExpense = async (id, updatedData) => {
    try {
      const updated = await updateExpense(id, updatedData);
      setExpenses((prev) => prev.map((exp) => (exp.id === id ? updated : exp)));
    } catch (error) {
      console.error('Failed to update expense:', error);
    }
  };

  const handleVoidExpense = async (id, reason) => {
    try {
      await voidExpense(id, reason);
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.id === id ? { ...exp, status: 'voided', voidReason: reason } : exp
        )
      );
    } catch (error) {
      console.error('Failed to void expense:', error);
    }
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setIsFormModalOpen(true);
  };

  const openVoidModal = (id) => {
    setVoidingExpenseId(id);
    setIsVoidModalOpen(true);
  };

  const handleFormSubmit = (data) => {
    if (editingExpense) {
      handleEditExpense(editingExpense.id, data);
    } else {
      handleAddExpense(data);
    }
    setEditingExpense(null);
  };

  const handleVoidConfirm = (id, reason) => {
    handleVoidExpense(id, reason);
    setVoidingExpenseId(null);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Sticky header: page title + nav tabs + global period control, all pinned together */}
      <div className="sticky -top-6 z-10 -mx-6 -mt-6 px-6 pt-6 pb-4 bg-white border-b border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              onClick={() => navigate('/app/finance')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft size={14} />
              Back to Finance
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Record and track business expenses by category
            </p>
          </div>
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-1 bg-gray-50 rounded-2xl p-1.5 border border-gray-100 w-full lg:w-fit overflow-x-auto">
            <button
              onClick={() => scrollToSection('own-expenses-section')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm transition-all duration-200 whitespace-nowrap"
            >
              <Receipt size={16} />
              Other Expenses
            </button>
            <button
              onClick={() => scrollToSection('vendor-expenses-section')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm transition-all duration-200 whitespace-nowrap"
            >
              <Truck size={16} />
              Vendor Orders
            </button>
            <button
              onClick={() => scrollToSection('salary-expenses-section')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-sm transition-all duration-200 whitespace-nowrap"
            >
              <Users size={16} />
              Salary Expenses
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            <span className="text-xs text-gray-400 whitespace-nowrap">Apply to all tables:</span>
            <PeriodSelector
              period={globalPeriod}
              onPeriodChange={setGlobalPeriod}
              customFrom={globalCustomFrom}
              customTo={globalCustomTo}
              onCustomFromChange={setGlobalCustomFrom}
              onCustomToChange={setGlobalCustomTo}
            />
            <button
              onClick={applyGlobalPeriod}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveReportType('summary')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
          >
            <FileText size={16} />
            Generate Report
          </button>
          <button
            onClick={() => setActiveReportType('other')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
          >
            <ClipboardList size={16} />
            Other Expenses Report
          </button>
          <button
            onClick={() => setActiveReportType('vendor')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition"
          >
            <ClipboardList size={16} />
            Vendor Orders Report
          </button>
          <button
            onClick={() => setActiveReportType('salary')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition"
          >
            <ClipboardList size={16} />
            Salary Report
          </button>
          <button
            onClick={() => setActiveReportType('full')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition"
          >
            <FileText size={16} />
            Generate Detailed Report
          </button>
          <button
            onClick={() => navigate('/app/finance/expenses/compare')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
          >
            <BarChart3 size={16} />
            Compare & Trends
          </button>
        </div>
      </div>

      {/* Direct Expenses (editable) */}
      <motion.div id="own-expenses-section" variants={itemVariants} className="scroll-mt-6">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500 mt-2">Loading expenses...</p>
          </div>
        ) : (
          <ExpenseTable
            expenses={filteredExpenses}
            filters={expenseFilters}
            onFilterChange={setExpenseFilters}
            onEdit={openEditModal}
            onVoid={openVoidModal}
            sortField={sort.field}
            sortDirection={sort.direction}
            onSort={(field, direction) => setSort({ field, direction })}
          />
        )}
      </motion.div>

      {/* Vendor Order Expenses (read-only) */}
      <motion.div id="vendor-expenses-section" variants={itemVariants} className="mt-8 scroll-mt-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Vendor Order Expenses</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Read-only — managed from the Vendors module
          </p>
        </div>
        {vendorLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500 mt-2">Loading vendor orders...</p>
          </div>
        ) : (
          <VendorExpensesTable
            orders={filteredVendorOrders}
            filters={vendorFilters}
            onFilterChange={setVendorFilters}
          />
        )}
      </motion.div>

      {/* Salary Expenses (read-only) */}
      <motion.div id="salary-expenses-section" variants={itemVariants} className="mt-8 scroll-mt-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Salary Expenses</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Read-only — managed from the HR module
          </p>
        </div>
        {salaryLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500 mt-2">Loading salary records...</p>
          </div>
        ) : (
          <SalaryExpensesTable
            salaries={filteredSalaries}
            filters={salaryFilters}
            onFilterChange={setSalaryFilters}
          />
        )}
      </motion.div>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingExpense}
      />

      <VoidConfirmationModal
        isOpen={isVoidModalOpen}
        onClose={() => {
          setIsVoidModalOpen(false);
          setVoidingExpenseId(null);
        }}
        onConfirm={handleVoidConfirm}
        expenseId={voidingExpenseId}
      />

      <GenerateReportModal
        reportType={activeReportType}
        onClose={() => setActiveReportType(null)}
        expenses={expenses}
        vendorOrders={vendorOrders}
        salaries={salaries}
      />
    </motion.div>
  );
}