import { useState, useMemo } from 'react';
import { X, FileText } from 'lucide-react';
import {
  getExpenseSummary,
  getPeriodRange,
  getMonthLabelsInRange,
  PERIOD_OPTIONS,
} from '../services/reportService';
import { formatCurrency } from '../utils/helpers';
import { getCategoryLabel } from '../services/expenseService';

const REPORT_TITLES = {
  summary: 'Summary Report (Totals)',
  other: 'Other Expenses — Detailed Report',
  vendor: 'Vendor Orders — Detailed Report',
  salary: 'Salary — Detailed Report',
  full: 'Full Detailed Report (All 3 Tables)',
};

function isWithinRange(dateStr, dateFrom, dateTo) {
  if (!dateStr) return false;
  if (dateFrom && dateStr < dateFrom) return false;
  if (dateTo && dateStr > dateTo) return false;
  return true;
}

function groupSum(items, keyFn, valueFn) {
  const map = {};
  for (const item of items) {
    const key = keyFn(item);
    map[key] = (map[key] || 0) + valueFn(item);
  }
  return map;
}

export default function GenerateReportModal({
  reportType,
  onClose,
  expenses = [],
  vendorOrders = [],
  salaries = [],
}) {
  const [period, setPeriod] = useState('this-month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryReport, setSummaryReport] = useState(null);

  const range = useMemo(() => {
    if (period === 'custom') {
      if (!customFrom || !customTo) return null;
      return { dateFrom: customFrom, dateTo: customTo };
    }
    return getPeriodRange(period);
  }, [period, customFrom, customTo]);

  const detailedOther = useMemo(() => {
    if (!range) return null;
    const items = expenses
      .filter((e) => e.status !== 'voided' && isWithinRange(e.date, range.dateFrom, range.dateTo))
      .sort((a, b) => a.date.localeCompare(b.date));
    const byCategory = groupSum(items, (e) => e.category, (e) => e.amount);
    const total = items.reduce((s, e) => s + e.amount, 0);
    return { items, byCategory, total };
  }, [expenses, range]);

  const detailedVendor = useMemo(() => {
    if (!range) return null;
    const items = vendorOrders
      .filter((o) => o.status !== 'cancelled' && isWithinRange(o.orderDate, range.dateFrom, range.dateTo))
      .sort((a, b) => a.orderDate.localeCompare(b.orderDate));
    const byVendor = groupSum(items, (o) => o.vendorName, (o) => o.total);
    const total = items.reduce((s, o) => s + o.total, 0);
    return { items, byVendor, total };
  }, [vendorOrders, range]);

  const detailedSalary = useMemo(() => {
    if (!range) return null;
    const monthLabels = getMonthLabelsInRange(range.dateFrom, range.dateTo);
    const items = salaries.filter((s) => monthLabels.includes(s.month));
    const total = items.reduce((s, r) => s + r.totalSalary, 0);
    const totalBase = items.reduce((s, r) => s + r.baseSalary, 0);
    const totalOT = items.reduce((s, r) => s + r.otAmount, 0);
    const totalBonus = items.reduce((s, r) => s + r.bonus, 0);
    return { items, total, totalBase, totalOT, totalBonus };
  }, [salaries, range]);

  if (!reportType) return null;

  const needsSummaryFetch = reportType === 'summary' || reportType === 'full';

  const handleGenerate = async () => {
    setError('');
    if (!range) {
      setError('Please select both start and end dates');
      return;
    }
    if (needsSummaryFetch) {
      setLoading(true);
      try {
        const data = await getExpenseSummary(range.dateFrom, range.dateTo);
        setSummaryReport(data);
      } catch (err) {
        console.error('Failed to generate report:', err);
        setError('Failed to generate report. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setSummaryReport({}); // marks "generated" for detailed-only types (other/vendor/salary), which need no fetch
    }
  };

  const handleClose = () => {
    setSummaryReport(null);
    setError('');
    onClose();
  };

  const generated = summaryReport !== null;

  const handleExportPDF = async () => {
    if (!range) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    const addHeader = (subtitle) => {
      doc.setFontSize(15);
      doc.setFont(undefined, 'bold');
      doc.text('Hanthana ERP', pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(11);
      doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100);
      doc.text(`Period: ${range.dateFrom} to ${range.dateTo} · Generated ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
      y += 10;
      doc.setTextColor(0);
    };

    const addOtherSection = () => {
      const d = detailedOther;
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text('Other Expenses — by category', 14, y);
      y += 4;
      const catRows = Object.entries(d.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => [getCategoryLabel(cat), formatCurrency(amt)]);
      autoTable(doc, {
        startY: y,
        head: [['Category', 'Amount']],
        body: catRows.length ? catRows : [['No records', formatCurrency(0)]],
        foot: [['Subtotal', formatCurrency(d.total)]],
        theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        footStyles: { fillColor: [243, 244, 246], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 9 }, margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text(`Other Expenses — itemized (${d.items.length} records)`, 14, y);
      y += 4;
      const itemRows = d.items.map((e) => [e.date, getCategoryLabel(e.category), e.description, formatCurrency(e.amount)]);
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Category', 'Description', 'Amount']],
        body: itemRows.length ? itemRows : [['—', '—', 'No records in this period', '—']],
        theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }, margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    };

    const addVendorSection = () => {
      const d = detailedVendor;
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text('Vendor Orders — by vendor', 14, y);
      y += 4;
      const vendorRows = Object.entries(d.byVendor).sort((a, b) => b[1] - a[1]).map(([v, amt]) => [v, formatCurrency(amt)]);
      autoTable(doc, {
        startY: y,
        head: [['Vendor', 'Amount']],
        body: vendorRows.length ? vendorRows : [['No records', formatCurrency(0)]],
        foot: [['Subtotal', formatCurrency(d.total)]],
        theme: 'grid', headStyles: { fillColor: [20, 184, 166] },
        footStyles: { fillColor: [243, 244, 246], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 9 }, margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;

      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text(`Vendor Orders — itemized (${d.items.length} records)`, 14, y);
      y += 4;
      const itemRows = d.items.map((o) => [o.orderDate, o.vendorName, o.productName, o.quantity, formatCurrency(o.unitPrice), formatCurrency(o.total), o.status]);
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Vendor', 'Product', 'Qty', 'Unit Price', 'Total', 'Status']],
        body: itemRows.length ? itemRows : [['—', '—', '—', '—', '—', 'No records in this period', '—']],
        theme: 'grid', headStyles: { fillColor: [20, 184, 166] },
        styles: { fontSize: 8 }, margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    };

    const addSalarySection = () => {
      const d = detailedSalary;
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text(`Salary — itemized (${d.items.length} records)`, 14, y);
      y += 4;
      const itemRows = d.items.map((s) => [s.employeeName, s.month, formatCurrency(s.baseSalary), formatCurrency(s.otAmount), formatCurrency(s.bonus), formatCurrency(s.totalSalary), s.paid ? 'Paid' : 'Pending']);
      autoTable(doc, {
        startY: y,
        head: [['Employee', 'Month', 'Base', 'OT', 'Bonus', 'Total', 'Status']],
        body: itemRows.length ? itemRows : [['—', '—', '—', '—', '—', 'No records in this period', '—']],
        foot: [['', '', formatCurrency(d.totalBase), formatCurrency(d.totalOT), formatCurrency(d.totalBonus), formatCurrency(d.total), '']],
        theme: 'grid', headStyles: { fillColor: [99, 102, 241] },
        footStyles: { fillColor: [243, 244, 246], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 8 }, margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    };

    if (reportType === 'summary') {
      addHeader('Expense Summary Report');
      const r = summaryReport;
      const catRows = Object.entries(r.otherExpenses.byCategory).map(([c, a]) => [getCategoryLabel(c), formatCurrency(a)]);
      autoTable(doc, {
        startY: y,
        head: [['Category', 'Amount']],
        body: catRows.length ? catRows : [['No records', formatCurrency(0)]],
        foot: [['Other Expenses Subtotal', formatCurrency(r.otherExpenses.total)]],
        theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        footStyles: { fillColor: [243, 244, 246], fontStyle: 'bold' },
        styles: { fontSize: 9 }, margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;
      autoTable(doc, {
        startY: y,
        head: [['Expense Type', 'Records', 'Amount']],
        body: [
          ['Other Expenses', r.otherExpenses.count, formatCurrency(r.otherExpenses.total)],
          ['Vendor Order Expenses', r.vendorExpenses.count, formatCurrency(r.vendorExpenses.total)],
          ['Salary Expenses', r.salaryExpenses.count, formatCurrency(r.salaryExpenses.total)],
        ],
        foot: [['Grand Total', '', formatCurrency(r.grandTotal)]],
        theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        footStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', fontSize: 11 },
        styles: { fontSize: 9 }, margin: { left: 14, right: 14 },
      });
    } else if (reportType === 'other') {
      addHeader('Other Expenses — Detailed Report');
      addOtherSection();
    } else if (reportType === 'vendor') {
      addHeader('Vendor Orders — Detailed Report');
      addVendorSection();
    } else if (reportType === 'salary') {
      addHeader('Salary — Detailed Report');
      addSalarySection();
    } else if (reportType === 'full') {
      addHeader('Full Detailed Expense Report');
      const r = summaryReport;
      autoTable(doc, {
        startY: y,
        head: [['Expense Type', 'Amount']],
        body: [
          ['Other Expenses', formatCurrency(r.otherExpenses.total)],
          ['Vendor Order Expenses', formatCurrency(r.vendorExpenses.total)],
          ['Salary Expenses', formatCurrency(r.salaryExpenses.total)],
        ],
        foot: [['Grand Total', formatCurrency(r.grandTotal)]],
        theme: 'grid', headStyles: { fillColor: [37, 99, 235] },
        footStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', fontSize: 11 },
        styles: { fontSize: 9 }, margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
      addOtherSection();
      doc.addPage(); y = 18;
      addVendorSection();
      doc.addPage(); y = 18;
      addSalarySection();
    }

    doc.save(`${reportType}-report_${range.dateFrom}_to_${range.dateTo}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{REPORT_TITLES[reportType]}</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Period</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={period}
              onChange={(e) => { setPeriod(e.target.value); setSummaryReport(null); }}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">From</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>

          {generated && range && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
              <p className="text-xs text-gray-400">{range.dateFrom} → {range.dateTo}</p>

              {reportType === 'summary' && summaryReport?.otherExpenses && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Other Expenses</h3>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(summaryReport.otherExpenses.total)}</span>
                    </div>
                    {Object.entries(summaryReport.otherExpenses.byCategory).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between text-xs text-gray-600">
                        <span>{getCategoryLabel(cat)}</span><span>{formatCurrency(amt)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Vendor Order Expenses</h3>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(summaryReport.vendorExpenses.total)}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Salary Expenses</h3>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(summaryReport.salaryExpenses.total)}</span>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900">Grand Total</h3>
                    <span className="text-base font-bold text-blue-900">{formatCurrency(summaryReport.grandTotal)}</span>
                  </div>
                </>
              )}

              {reportType === 'other' && detailedOther && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">By category</h3>
                    {Object.entries(detailedOther.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between text-xs text-gray-600">
                        <span>{getCategoryLabel(cat)}</span><span>{formatCurrency(amt)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900">Total ({detailedOther.items.length} records)</h3>
                    <span className="text-base font-bold text-blue-900">{formatCurrency(detailedOther.total)}</span>
                  </div>
                </>
              )}

              {reportType === 'vendor' && detailedVendor && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">By vendor</h3>
                    {Object.entries(detailedVendor.byVendor).sort((a, b) => b[1] - a[1]).map(([v, amt]) => (
                      <div key={v} className="flex items-center justify-between text-xs text-gray-600">
                        <span>{v}</span><span>{formatCurrency(amt)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900">Total ({detailedVendor.items.length} orders)</h3>
                    <span className="text-base font-bold text-blue-900">{formatCurrency(detailedVendor.total)}</span>
                  </div>
                </>
              )}

              {reportType === 'salary' && detailedSalary && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600"><span>Total base</span><span>{formatCurrency(detailedSalary.totalBase)}</span></div>
                    <div className="flex items-center justify-between text-xs text-gray-600"><span>Total OT</span><span>{formatCurrency(detailedSalary.totalOT)}</span></div>
                    <div className="flex items-center justify-between text-xs text-gray-600"><span>Total bonus</span><span>{formatCurrency(detailedSalary.totalBonus)}</span></div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900">Total ({detailedSalary.items.length} records)</h3>
                    <span className="text-base font-bold text-blue-900">{formatCurrency(detailedSalary.total)}</span>
                  </div>
                </>
              )}

              {reportType === 'full' && summaryReport?.grandTotal !== undefined && (
                <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-blue-900">Grand Total (all 3 sources)</h3>
                  <span className="text-base font-bold text-blue-900">{formatCurrency(summaryReport.grandTotal)}</span>
                </div>
              )}

              <button
                onClick={handleExportPDF}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
              >
                <FileText size={16} />
                Export as PDF (full detail)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}