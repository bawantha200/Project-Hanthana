import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, FileText, X, Printer, Loader2, Search } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

// Adjust this to match your project's actual backend base URL
// (check frontend/src/services/api.js for the pattern already used elsewhere)
const API_BASE = "http://localhost:5000/api";

const PAYMENT_COLORS = { ONLINE: "#38bdf8", CASH: "#f97316", CARD: "#2563eb" };

function formatLKR(value) {
  return "LKR " + Number(value || 0).toLocaleString();
}

// Your DB uses different status words in different places (PAID / COMPLETED / PENDING).
// This treats anything that isn't clearly pending as "paid" for display purposes.
function isPaid(status) {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === "PAID" || s === "COMPLETED";
}

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const header = Object.keys(rows[0]).join(",");
  const body = rows.map((r) => Object.values(r).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InvoicingReports() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [preset, setPreset] = useState("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  // ---- Fetch invoice list on mount ----
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/invoices`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "All") {
      list = list.filter((inv) =>
        statusFilter === "paid" ? isPaid(inv.paymentStatus) : !isPaid(inv.paymentStatus)
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (inv) =>
          (inv.invoiceNumber || "").toLowerCase().includes(q) ||
          String(inv.orderId || "").toLowerCase().includes(q) ||
          (inv.customer || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));

  // Keep the current page in range whenever the filtered list changes (e.g. status filter switched)
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, currentPage]);

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  function handleSearchChange(value) {
    setSearch(value);
    setCurrentPage(1);
  }

  // ---- Invoice detail modal ----
  async function openInvoice(invoiceId) {
    setDetailLoading(true);
    setSelectedInvoice({ id: invoiceId }); // open modal immediately with a loading state
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setSelectedInvoice(data);
    } catch (err) {
      setSelectedInvoice(null);
      alert("Could not load invoice details: " + err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  // ---- Report generator ----
  function getRangeForPreset() {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    let from;
    if (preset === "daily") {
      from = to;
    } else if (preset === "weekly") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().slice(0, 10);
    } else if (preset === "monthly") {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      from = d.toISOString().slice(0, 10);
    } else {
      from = customFrom;
    }
    return { from, to: preset === "custom" ? customTo : to };
  }

  async function generateReport() {
    const { from, to } = getRangeForPreset();
    setReportLoading(true);
    setReportError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      const res = await fetch(`${API_BASE}/invoices/report?${params.toString()}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setReport({ ...data, from, to });
    } catch (err) {
      setReportError(err.message);
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  function exportReportCSV() {
    if (!report) return;
    const summaryRow = {
      row_type: "SUMMARY",
      invoice_number: "",
      order_id: "",
      customer: "",
      date: "",
      amount: "",
      status: "",
      period_from: report.from,
      period_to: report.to,
      revenue: report.revenue,
      expenses: report.expenses,
      net_profit: report.netProfit,
      online_revenue: report.byPaymentType?.ONLINE || 0,
      cash_revenue: report.byPaymentType?.CASH || 0,
    };
    const invoiceRows = reportInvoices.map((inv) => ({
      row_type: "INVOICE",
      invoice_number: inv.invoiceNumber,
      order_id: inv.orderId,
      customer: inv.customer || "",
      date: inv.date.slice(0, 10),
      amount: inv.amount,
      status: isPaid(inv.paymentStatus) ? "Paid" : "Unpaid",
      period_from: "",
      period_to: "",
      revenue: "",
      expenses: "",
      net_profit: "",
      online_revenue: "",
      cash_revenue: "",
    }));
    downloadCSV(
      [summaryRow, ...invoiceRows],
      `financial-report-${report.from}-to-${report.to}.csv`
    );
  }

  function exportReportPDF() {
    if (!report) return;

    const rowsHtml = reportInvoices
      .map(
        (inv) => `
        <tr>
          <td>${inv.invoiceNumber}</td>
          <td>${inv.orderId}</td>
          <td>${inv.customer || "—"}</td>
          <td>${inv.date.slice(0, 10)}</td>
          <td style="text-align:right">${formatLKR(inv.amount)}</td>
          <td style="text-align:center">${isPaid(inv.paymentStatus) ? "Paid" : "Unpaid"}</td>
        </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Financial Report ${report.from} to ${report.to}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            td, th { border: 1px solid #e5e7eb; padding: 8px; font-size: 13px; }
            th { background: #f9fafb; text-align: left; text-transform: uppercase; font-size: 11px; color: #6b7280; }
            .summary td:first-child { background: #f9fafb; font-weight: 600; width: 200px; }
            .profit-positive { color: #059669; font-weight: 600; }
            .profit-negative { color: #e11d48; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>Financial Report</h1>
          <p class="subtitle">
            Period: ${report.from} to ${report.to} &middot; Generated ${new Date().toLocaleString()}
          </p>

          <table class="summary">
            <tr><td>Revenue</td><td>${formatLKR(report.revenue)}</td></tr>
            <tr><td>Total expenses</td><td>${formatLKR(report.expenses)}</td></tr>
            <tr><td>Net profit</td><td class="${report.netProfit >= 0 ? "profit-positive" : "profit-negative"}">${formatLKR(report.netProfit)}</td></tr>
            <tr><td>Online revenue</td><td>${formatLKR(report.byPaymentType?.ONLINE || 0)}</td></tr>
            <tr><td>Cash revenue</td><td>${formatLKR(report.byPaymentType?.CASH || 0)}</td></tr>
          </table>

          <h2 style="font-size:15px;">Invoices in this period (${reportInvoices.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th style="text-align:right">Amount</th>
                <th style="text-align:center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="6" style="text-align:center;color:#9ca3af;">No invoices in this period.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Print via a hidden iframe on this same page — unlike window.open(), this
    // can't be blocked by the browser's pop-up blocker, and it only prints
    // exactly the HTML we generate, not the surrounding app.
    let iframe = document.getElementById("report-print-frame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "report-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
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
  }

  const revenueBreakdownData = report
    ? Object.entries(report.byPaymentType || {})
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value, color: PAYMENT_COLORS[name] || "#94a3b8" }))
    : [];

  // Every invoice that falls inside the currently generated report's date range —
  // this is what backs both the on-screen "included invoices" list and the PDF export.
  const reportInvoices = useMemo(() => {
    if (!report) return [];
    const toInclusive = report.to ? `${report.to}T23:59:59.999` : null;
    return invoices
      .filter((inv) => {
        if (report.from && inv.date < report.from) return false;
        if (toInclusive && inv.date > toInclusive) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [invoices, report]);

  return (
    <>
      <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoicing & Revenue Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Invoices generated from completed orders, and period financial reports
        </p>
      </div>

      {/* ---------------- Invoice list ---------------- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-50">
          <h2 className="text-base font-semibold text-gray-900">Invoices</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search invoice no., order ID, or customer..."
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!loading && (
              <button
                onClick={fetchInvoices}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh
              </button>
            )}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading invoices...
          </div>
        ) : loadError ? (
          <div className="p-5 text-sm text-rose-500">
            Couldn't load invoices: {loadError}. Check that your backend is running and API_BASE
            matches its address.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Invoice No.</th>
                <th className="px-5 py-3 font-medium">Order ID</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium text-center">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{inv.orderId}</td>
                  <td className="px-5 py-3 text-gray-800">
                    {inv.customer || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {inv.date ? inv.date.slice(0, 10) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">
                    {formatLKR(inv.amount)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        isPaid(inv.paymentStatus)
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {isPaid(inv.paymentStatus) ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => openInvoice(inv.id)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                    {search.trim() || statusFilter !== "All"
                      ? "No invoices match your search or filter."
                      : "No invoices yet. Invoices appear automatically once an order is marked DELIVERED."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {!loading && !loadError && filteredInvoices.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 text-sm">
            <span className="text-gray-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredInvoices.length)} of{" "}
              {filteredInvoices.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
                )
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-gray-400">…</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 rounded-lg border text-sm ${
                        p === currentPage
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Report generator ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Report generator</h2>

          <div className="flex flex-wrap items-end gap-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily (today)</option>
                <option value="weekly">Weekly (last 7 days)</option>
                <option value="monthly">Monthly (last 30 days)</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            {preset === "custom" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            <button
              onClick={generateReport}
              disabled={reportLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-2"
            >
              {reportLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate report
            </button>
          </div>

          {reportError ? (
            <p className="text-sm text-rose-500">Couldn't generate report: {reportError}</p>
          ) : report ? (
            <div>
              <p className="text-xs text-gray-400 mb-3">
                {report.from} to {report.to} · {report.invoiceCount} invoice(s) in range
              </p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-xs text-gray-500 mb-1">Revenue</p>
                  <p className="text-lg font-bold text-gray-900">{formatLKR(report.revenue)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-xs text-gray-500 mb-1">Total expenses</p>
                  <p className="text-lg font-bold text-gray-900">{formatLKR(report.expenses)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-xs text-gray-500 mb-1">Net profit</p>
                  <p
                    className={`text-lg font-bold ${
                      report.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {formatLKR(report.netProfit)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportReportCSV}
                  className="flex items-center gap-1.5 text-sm border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-gray-700"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={exportReportPDF}
                  className="flex items-center gap-1.5 text-sm border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-gray-700"
                >
                  <Printer className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Pick a period and click "Generate report" to see revenue, expenses, and profit.
            </p>
          )}
        </div>

        {/* Revenue breakdown by payment type */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900">Revenue breakdown</h2>
          <p className="text-xs text-gray-400 mb-4">By payment type — current report</p>
          {report && revenueBreakdownData.length > 0 ? (
            <>
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={revenueBreakdownData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {revenueBreakdownData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {revenueBreakdownData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600 capitalize">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name.toLowerCase()}
                    </span>
                    <span className="font-medium text-gray-800">{formatLKR(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Generate a report to see the breakdown.</p>
          )}
        </div>
      </div>

      {/* ---------------- Invoices included in the current report ---------------- */}
      {report && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mt-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Invoices in this period ({reportInvoices.length})
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            {report.from} to {report.to}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 font-medium">Invoice No.</th>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {reportInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{inv.orderId}</td>
                  <td className="px-4 py-2 text-gray-800">{inv.customer || "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{inv.date.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {formatLKR(inv.amount)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        isPaid(inv.paymentStatus)
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {isPaid(inv.paymentStatus) ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                </tr>
              ))}
              {reportInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No invoices fall within this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------- Invoice detail modal ---------------- */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedInvoice.invoiceNumber || "Loading..."}
                </h3>
                {selectedInvoice.orderId && (
                  <p className="text-xs text-gray-400">Order {selectedInvoice.orderId}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading invoice...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="text-gray-800">{selectedInvoice.customer || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Date</p>
                    <p className="text-gray-800">
                      {selectedInvoice.date ? selectedInvoice.date.slice(0, 10) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Payment type</p>
                    <p className="text-gray-800 capitalize">
                      {selectedInvoice.paymentMethod?.toLowerCase() || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <p className="text-gray-800">
                      {isPaid(selectedInvoice.paymentStatus) ? "Paid" : "Unpaid"}
                    </p>
                  </div>
                </div>

                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="py-2 font-medium">Item</th>
                      <th className="py-2 font-medium text-center">Qty</th>
                      <th className="py-2 font-medium text-right">Unit price</th>
                      <th className="py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-700">{item.name}</td>
                        <td className="py-2 text-center text-gray-500">{item.qty}</td>
                        <td className="py-2 text-right text-gray-500">
                          {formatLKR(item.unitPrice)}
                        </td>
                        <td className="py-2 text-right text-gray-800 font-medium">
                          {formatLKR(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mb-5">
                  <span className="text-sm font-medium text-gray-700">Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatLKR(selectedInvoice.amount)}
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 text-sm border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-gray-700"
                  >
                    <Printer className="w-4 h-4" />
                    Print / Save as PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
