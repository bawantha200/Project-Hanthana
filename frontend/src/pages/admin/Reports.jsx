import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  FileText, Download, Calendar, BarChart3, Package, Users, DollarSign, Truck, Receipt, Loader2, Printer,
} from 'lucide-react';
import api, { inventoryAPI } from '../../services/api';
import { getExpenses } from '../../services/expenseService';
import { getVendorOrders } from '../../services/vendorOrdersService';
import { getSalaries } from '../../services/salaryService';
import { getMonthLabelsInRange } from '../../services/reportService';
import { formatCurrency } from '../../utils/helpers';

// Same base the Invoicing & Revenue Reports page already talks to for
// /invoices and /invoices/report. Keep this in sync if that changes.
const API_BASE = 'http://localhost:5000/api';

const PAYMENT_COLORS = { ONLINE: '#38bdf8', CASH: '#f97316', CARD: '#2563eb' };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const cardClass =
  'bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200';

const isPaidStatus = (status) => {
  if (!status) return false;
  const s = String(status).toUpperCase();
  return s === 'PAID' || s === 'COMPLETED';
};

const isWithinRange = (dateStr, dateFrom, dateTo) => {
  if (!dateStr) return false;
  if (dateFrom && dateStr < dateFrom) return false;
  if (dateTo && dateStr > dateTo) return false;
  return true;
};

// ---- Export helpers, matching the pattern already used on the Invoicing
// & Revenue Reports page: plain CSV download, and PDF via a hidden
// print-iframe (no extra libraries needed). ----
const downloadCSV = (rows, filename) => {
  if (!rows.length) return;
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map((r) => Object.values(r).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const printReport = (title, subtitle, summary, rows) => {
  const columns = rows.length ? Object.keys(rows[0]) : [];

  const summaryHtml = summary
    .map((item) => `<tr><td>${item.label}</td><td>${item.value}</td></tr>`)
    .join('');

  const rowsHtml = rows
    .map(
      (row) =>
        `<tr>${columns.map((col) => `<td>${row[col] ?? '—'}</td>`).join('')}</tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          td, th { border: 1px solid #e5e7eb; padding: 8px; font-size: 13px; text-align: left; }
          th { background: #f9fafb; text-transform: uppercase; font-size: 11px; color: #6b7280; }
          .summary td:first-child { background: #f9fafb; font-weight: 600; width: 200px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="subtitle">${subtitle} &middot; Generated ${new Date().toLocaleString()}</p>
        <table class="summary">${summaryHtml}</table>
        <h2 style="font-size:15px;">Records (${rows.length})</h2>
        <table>
          <thead><tr>${columns.map((c) => `<th>${c.replace(/_/g, ' ')}</th>`).join('')}</tr></thead>
          <tbody>${rowsHtml || `<tr><td colspan="${columns.length || 1}" style="text-align:center;color:#9ca3af;">No records in this period.</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `;

  let iframe = document.getElementById('report-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'report-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };
};

// Each entry mirrors the report-generation logic that already exists and
// works on its own page (Invoicing & Revenue Reports, Expense Management).
// Nothing here is invented — field names match those pages exactly.
const REPORT_CONFIG = {
  financial: {
    label: 'Financial Report',
    description: 'Revenue, expenses, net profit and payment-type breakdown from invoices',
    icon: DollarSign,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    fileBaseName: 'financial-report',
    title: 'Financial Report',
    async fetch({ dateFrom, dateTo }) {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const [reportRes, invoicesRes] = await Promise.all([
        fetch(`${API_BASE}/invoices/report?${params.toString()}`),
        fetch(`${API_BASE}/invoices`),
      ]);
      if (!reportRes.ok) throw new Error(`Server responded with ${reportRes.status}`);
      const report = await reportRes.json();
      const allInvoices = invoicesRes.ok ? await invoicesRes.json() : [];

      const toInclusive = dateTo ? `${dateTo}T23:59:59.999` : null;
      const rows = allInvoices
        .filter((inv) => {
          if (dateFrom && inv.date < dateFrom) return false;
          if (toInclusive && inv.date > toInclusive) return false;
          return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((inv) => ({
          invoice_no: inv.invoiceNumber,
          order_id: inv.orderId,
          customer: inv.customer || '',
          date: inv.date ? inv.date.slice(0, 10) : '',
          amount: inv.amount,
          status: isPaidStatus(inv.paymentStatus) ? 'Paid' : 'Unpaid',
        }));

      const pieData = Object.entries(report.byPaymentType || {})
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value, color: PAYMENT_COLORS[name] || '#94a3b8' }));

      return {
        summary: [
          { label: 'Revenue', value: formatCurrency(report.revenue || 0) },
          { label: 'Total Expenses', value: formatCurrency(report.expenses || 0) },
          { label: 'Net Profit', value: formatCurrency(report.netProfit || 0) },
          { label: 'Online Revenue', value: formatCurrency(report.byPaymentType?.ONLINE || 0) },
        ],
        pieData,
        rows,
      };
    },
  },
  expenses: {
    label: 'Expense Report',
    description: 'Business expenses by category (excludes vendor orders and salaries)',
    icon: Receipt,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    fileBaseName: 'expense-report',
    title: 'Expense Report',
    async fetch({ dateFrom, dateTo }) {
      const all = await getExpenses();
      const rows = all.filter(
        (exp) => exp.status !== 'voided' && isWithinRange(exp.date, dateFrom, dateTo)
      );
      const total = rows.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const byCategory = {};
      rows.forEach((exp) => {
        byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amount || 0);
      });

      return {
        summary: [
          { label: 'Total Expenses', value: formatCurrency(total) },
          ...Object.entries(byCategory).map(([category, amount]) => ({
            label: category.replace(/_/g, ' '),
            value: formatCurrency(amount),
          })),
        ],
        rows: rows.map((exp) => ({
          date: exp.date,
          category: exp.category,
          description: exp.description,
          amount: exp.amount,
          status: exp.status,
        })),
      };
    },
  },
  vendor: {
    label: 'Vendor Orders Report',
    description: 'Orders placed with vendors (read-only, managed from Vendors module)',
    icon: Truck,
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    fileBaseName: 'vendor-orders-report',
    title: 'Vendor Orders Report',
    async fetch({ dateFrom, dateTo }) {
      const all = await getVendorOrders();
      const rows = all.filter((o) => isWithinRange(o.orderDate, dateFrom, dateTo));

      return {
        summary: [
          { label: 'Total Orders', value: rows.length },
          { label: 'Completed', value: rows.filter((o) => String(o.status).toLowerCase() === 'completed').length },
        ],
        rows,
      };
    },
  },
  hr: {
    label: 'Salary / HR Report',
    description: 'Salary disbursement by employee and month (read-only, managed from HR module)',
    icon: Users,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    fileBaseName: 'hr-salary-report',
    title: 'Salary / HR Report',
    async fetch({ dateFrom, dateTo }) {
      const all = await getSalaries();
      const monthLabels = getMonthLabelsInRange(dateFrom, dateTo);
      const rows = all.filter((s) => monthLabels.includes(s.month));
      const paidCount = rows.filter((s) => s.paid).length;

      return {
        summary: [
          { label: 'Employees in range', value: rows.length },
          { label: 'Paid', value: paidCount },
          { label: 'Unpaid', value: rows.length - paidCount },
        ],
        rows,
      };
    },
  },
  inventory: {
    label: 'Inventory Report',
    description: 'Live stock snapshot — sealed and empty bottle counts',
    icon: Package,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    fileBaseName: 'inventory-report',
    title: 'Inventory Report',
    async fetch() {
      const stockRes = await inventoryAPI.getStockSummary();
      const summaryObj = stockRes?.data?.summary || {};
      return {
        summary: [
          { label: 'Sealed Bottles', value: summaryObj.sealed_bottles ?? 0 },
          { label: 'Empty Bottles', value: summaryObj.empty_bottles ?? 0 },
          { label: 'Total Stock', value: summaryObj.total ?? 0 },
        ],
        rows: [summaryObj],
      };
    },
  },
  delivery: {
    label: 'Delivery Report',
    description: 'Delivery status and volumes for the selected period',
    icon: Truck,
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    fileBaseName: 'delivery-report',
    title: 'Delivery Report',
    async fetch({ dateFrom, dateTo }) {
      const res = await api.get('/deliveries', { params: { dateFrom, dateTo } });
      const rows = res?.data?.deliveries || [];
      const upperStatus = (d) => String(d.status || '').toUpperCase();
      return {
        summary: [
          { label: 'Total Deliveries', value: rows.length },
          { label: 'Active', value: rows.filter((d) => !['DELIVERED', 'CANCELLED'].includes(upperStatus(d))).length },
          { label: 'Delivered', value: rows.filter((d) => upperStatus(d) === 'DELIVERED').length },
        ],
        rows,
      };
    },
  },
};

const getDefaultRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
};

export default function Reports() {
  const defaultRange = useMemo(getDefaultRange, []);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  const reportTypes = Object.entries(REPORT_CONFIG).map(([key, config]) => ({ key, ...config }));
  const activeConfig = selectedReport ? REPORT_CONFIG[selectedReport] : null;
  const previewColumns = reportData?.rows?.length ? Object.keys(reportData.rows[0]) : [];

  const handleGenerate = async () => {
    if (!activeConfig) return;
    setLoadingReport(true);
    setReportError(null);
    setReportData(null);
    try {
      const result = await activeConfig.fetch({ dateFrom, dateTo });
      setReportData(result);
    } catch (error) {
      console.error('Failed to generate report:', error);
      setReportError(
        error.message?.includes('Server responded')
          ? `Couldn't reach the backend: ${error.message}. Check that it's running and API_BASE is correct.`
          : 'Failed to generate this report. Please try again.'
      );
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportCsv = () => {
    if (!reportData?.rows?.length || !activeConfig) return;
    downloadCSV(reportData.rows, `${activeConfig.fileBaseName}-${dateFrom}-to-${dateTo}.csv`);
  };

  const handleExportPdf = () => {
    if (!reportData || !activeConfig) return;
    printReport(activeConfig.title, `${dateFrom} to ${dateTo}`, reportData.summary, reportData.rows);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate and export live business reports across all departments
        </p>
      </motion.div>

      {/* Report Type Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <motion.div
              key={report.key}
              whileHover={{ y: -2 }}
              onClick={() => {
                setSelectedReport(report.key);
                setReportData(null);
                setReportError(null);
              }}
              className={`${cardClass} p-5 cursor-pointer ${
                selectedReport === report.key ? 'ring-2 ring-blue-500 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${report.bgColor} flex items-center justify-center`}>
                  <Icon size={18} className={report.textColor} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{report.label}</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{report.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Date Range Selector */}
      <motion.div variants={itemVariants} className={`${cardClass} p-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Date Range</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedReport ? `Reporting period for ${activeConfig.label}` : 'Select a report type above, then choose a period'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={!selectedReport || loadingReport}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingReport ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
            {loadingReport ? 'Generating…' : 'Generate Report'}
          </motion.button>
          {!selectedReport && <p className="text-xs text-gray-400">Pick a report type above first.</p>}
        </div>
      </motion.div>

      {/* Error state */}
      {reportError && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {reportError}
        </motion.div>
      )}

      {/* Summary + payment breakdown */}
      {reportData && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reportData.summary.map((stat) => {
              const Icon = activeConfig?.icon || FileText;
              return (
                <div key={stat.label} className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${activeConfig?.bgColor || 'bg-gray-50'} flex items-center justify-center`}>
                      <Icon size={18} className={activeConfig?.textColor || 'text-gray-600'} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment-type breakdown, only present for the financial report */}
          {reportData.pieData && (
            <div className={`${cardClass} p-5`}>
              <h2 className="text-base font-semibold text-gray-900">Revenue Breakdown</h2>
              <p className="text-xs text-gray-400 mb-4">By payment type — current report</p>
              {reportData.pieData.length > 0 ? (
                <>
                  <div style={{ width: '100%', height: 140 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={reportData.pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62} paddingAngle={2}>
                          {reportData.pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {reportData.pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-600 capitalize">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                          {item.name.toLowerCase()}
                        </span>
                        <span className="font-medium text-gray-800">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">No payment data for this period.</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Report preview + export */}
      {reportData && (
        <motion.div variants={itemVariants} className={`${cardClass} overflow-hidden`}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Report Preview</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {reportData.rows.length} record{reportData.rows.length === 1 ? '' : 's'} · {dateFrom} to {dateTo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExportCsv}
                disabled={!reportData.rows.length}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                CSV
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium hover:bg-rose-100 transition-colors"
              >
                <Printer size={14} />
                PDF
              </motion.button>
            </div>
          </div>

          {reportData.rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No records found for this date range.</div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100">
                    {previewColumns.map((col) => (
                      <th key={col} className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row, idx) => (
                    <tr key={row.id ?? idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      {previewColumns.map((col) => (
                        <td key={col} className="py-3 px-4 text-gray-700 whitespace-nowrap">
                          {row[col] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state before anything has been generated */}
      {!reportData && !reportError && (
        <motion.div variants={itemVariants} className={`${cardClass} p-10 text-center`}>
          <FileText size={28} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            Pick a report type and date range, then click <strong>Generate Report</strong> to pull live data and export it.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}