import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { getExpenseSummary, getPeriodRange, PERIOD_OPTIONS } from '../services/reportService';
import { formatCurrency } from '../utils/helpers';
import { getCategoryLabel } from '../services/expenseService';

export default function GenerateReportModal({ isOpen, onClose }) {
  const [period, setPeriod] = useState('this-month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setError('');
    let dateFrom, dateTo;

    if (period === 'custom') {
      if (!customFrom || !customTo) {
        setError('Please select both start and end dates');
        return;
      }
      dateFrom = customFrom;
      dateTo = customTo;
    } else {
      const range = getPeriodRange(period);
      dateFrom = range.dateFrom;
      dateTo = range.dateTo;
    }

    setLoading(true);
    try {
      const data = await getExpenseSummary(dateFrom, dateTo);
      setReport(data);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReport(null);
    setError('');
    onClose();
  };

  const handleExportPDF = async () => {
    if (!report) return;

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Hanthana ERP - Expense Report', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Period: ${report.period.dateFrom} to ${report.period.dateTo}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
    y += 12;
    doc.setTextColor(0);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Other Expenses', 14, y);
    y += 4;

    const otherRows = Object.entries(report.otherExpenses.byCategory).map(([cat, amt]) => [
      getCategoryLabel(cat),
      formatCurrency(amt),
    ]);
    if (otherRows.length === 0) {
      otherRows.push(['No records', formatCurrency(0)]);
    }

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount']],
      body: otherRows,
      foot: [['Subtotal', formatCurrency(report.otherExpenses.total)]],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [243, 244, 246], textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Expense Type', 'Records', 'Amount']],
      body: [
        ['Other Expenses', report.otherExpenses.count, formatCurrency(report.otherExpenses.total)],
        ['Vendor Order Expenses', report.vendorExpenses.count, formatCurrency(report.vendorExpenses.total)],
        ['Salary Expenses', report.salaryExpenses.count, formatCurrency(report.salaryExpenses.total)],
      ],
      foot: [['Grand Total', '', formatCurrency(report.grandTotal)]],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', fontSize: 11 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    const filename = `expense-report_${report.period.dateFrom}_to_${report.period.dateTo}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Generate Expense Report</h2>
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
              onChange={(e) => {
                setPeriod(e.target.value);
                setReport(null);
              }}
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
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
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

          {report && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
              <p className="text-xs text-gray-400">
                {report.period.dateFrom} → {report.period.dateTo}
              </p>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Other Expenses</h3>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(report.otherExpenses.total)}
                  </span>
                </div>
                <div className="space-y-1">
                  {Object.entries(report.otherExpenses.byCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{getCategoryLabel(cat)}</span>
                      <span>{formatCurrency(amt)}</span>
                    </div>
                  ))}
                  {report.otherExpenses.count === 0 && (
                    <p className="text-xs text-gray-400">No records in this period</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Vendor Order Expenses</h3>
                  <p className="text-xs text-gray-400">{report.vendorExpenses.count} order(s)</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(report.vendorExpenses.total)}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Salary Expenses</h3>
                  <p className="text-xs text-gray-400">{report.salaryExpenses.count} record(s)</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(report.salaryExpenses.total)}
                </span>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-900">Grand Total</h3>
                <span className="text-base font-bold text-blue-900">
                  {formatCurrency(report.grandTotal)}
                </span>
              </div>

              <button
                onClick={handleExportPDF}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
              >
                <FileText size={16} />
                Export as PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}