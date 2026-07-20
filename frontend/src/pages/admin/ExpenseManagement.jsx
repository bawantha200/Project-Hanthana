import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Truck, Users, FileText } from 'lucide-react';
import ExpenseTable from '../../components/ExpenseTable';
import ExpenseFormModal from '../../components/ExpenseFormModal';
import VoidConfirmationModal from '../../components/VoidConfirmationModal';
import VendorExpensesTable from '../../components/VendorExpensesTable';
import SalaryExpensesTable from '../../components/SalaryExpensesTable';
import {
  getExpenses,
  addExpense,
  updateExpense,
  voidExpense,
} from '../../services/expenseService';
import GenerateReportModal from '../../components/GenerateReportModal';
import { getVendorOrders } from '../../services/vendorOrdersService';
import { getSalaries } from '../../services/salaryService';

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

export default function ExpenseManagement() {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- Direct expenses (editable) ---
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [sort, setSort] = useState({ field: 'date', direction: 'desc' });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [voidingExpenseId, setVoidingExpenseId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // --- Vendor orders (read-only) ---
  const [vendorOrders, setVendorOrders] = useState([]);
  const [vendorLoading, setVendorLoading] = useState(false);

  // --- Salaries (read-only) ---
  const [salaries, setSalaries] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

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

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (filters.category) {
      result = result.filter((exp) => exp.category === filters.category);
    }
    if (filters.dateFrom) {
      result = result.filter((exp) => exp.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter((exp) => exp.date <= filters.dateTo);
    }
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter((exp) =>
        exp.description.toLowerCase().includes(query)
      );
    }

    if (sort.field) {
      result.sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        if (typeof aVal === 'string') {
          return sort.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [expenses, filters, sort]);

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
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/finance')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft size={14} />
            Back to Finance
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Record and track business expenses by category
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollToSection('vendor-expenses-section')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <Truck size={16} />
            Vendor Expenses
          </button>
          <button
            onClick={() => scrollToSection('salary-expenses-section')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <Users size={16} />
            Salary Expenses
          </button>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
          >
            <FileText size={16} />
            Generate Report
          </button>
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>
      </motion.div>

      {/* Direct Expenses (editable) */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-sm text-gray-500 mt-2">Loading expenses...</p>
          </div>
        ) : (
          <ExpenseTable
            expenses={filteredExpenses}
            onEdit={openEditModal}
            onVoid={openVoidModal}
            filterCategory={filters.category}
            filterDateFrom={filters.dateFrom}
            filterDateTo={filters.dateTo}
            searchQuery={filters.search}
            onFilterChange={setFilters}
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
          <VendorExpensesTable orders={vendorOrders} />
        )}
      </motion.div>

      {/* Salary Expenses (read-only) */}
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
          <SalaryExpensesTable salaries={salaries} />
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
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </motion.div>
  );
}