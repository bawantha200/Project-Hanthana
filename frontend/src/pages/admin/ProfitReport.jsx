import React, { useState, useRef, useEffect } from "react";
import { TrendingUp, TrendingDown, Loader2, Download, Printer } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_BASE = "http://localhost:5000/api";

function formatLKR(value) {
  return "LKR " + Number(value || 0).toLocaleString();
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatLKR(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function ProfitReport() {
  const [preset, setPreset] = useState("weekly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartWrapperRef = useRef(null);

  // Load default weekly report on mount
  useEffect(() => {
    generateReport();
  }, []);

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
    if (preset === "custom" && (!from || !to)) {
      setError("Please pick both a start and end date for a custom range.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      const res = await fetch(`${API_BASE}/invoices/profit-trend?${params.toString()}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setReport({ ...data, from, to });
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!report) return;
    const summaryRow = {
      row_type: "SUMMARY",
      label: "",
      period_from: report.from,
      period_to: report.to,
      granularity: report.granularity,
      revenue: report.summary.revenue,
      expenses: report.summary.expenses,
      net_profit: report.summary.netProfit,
    };
    const pointRows = report.points.map((p) => ({
      row_type: "POINT",
      label: p.label,
      period_from: "",
      period_to: "",
      granularity: "",
      revenue: p.revenue,
      expenses: p.expenses,
      net_profit: p.profit,
    }));
    downloadCSV([summaryRow, ...pointRows], `profit-report-${report.from}-to-${report.to}.csv`);
  }

  function exportPDF() {
    if (!report) return;

    // Grab the actual rendered chart SVG so the PDF shows the real line graph,
    // not just numbers.
    const svgEl = chartWrapperRef.current?.querySelector("svg");
    const chartHtml = svgEl
      ? svgEl.outerHTML
      : `<p style="color:#9ca3af;">Chart not available.</p>`;

    const rowsHtml = report.points
      .map(
        (p) => `
        <tr>
          <td>${p.label}</td>
          <td style="text-align:right">${formatLKR(p.revenue)}</td>
          <td style="text-align:right">${formatLKR(p.expenses)}</td>
          <td style="text-align:right">${formatLKR(p.profit)}</td>
        </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Profit Report ${report.from} to ${report.to}</title>
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
            .chart-box { margin-bottom: 24px; }
            svg { max-width: 100%; }
          </style>
        </head>
        <body>
          <h1>Profit Report</h1>
          <p class="subtitle">
            Period: ${report.from} to ${report.to} &middot; ${report.granularity}ly view
            &middot; Generated ${new Date().toLocaleString()}
          </p>

          <table class="summary">
            <tr><td>Revenue</td><td>${formatLKR(report.summary.revenue)}</td></tr>
            <tr><td>Total expenses</td><td>${formatLKR(report.summary.expenses)}</td></tr>
            <tr><td>Net profit</td><td class="${report.summary.netProfit >= 0 ? "profit-positive" : "profit-negative"}">${formatLKR(report.summary.netProfit)}</td></tr>
          </table>

          <div class="chart-box">${chartHtml}</div>

          <h2 style="font-size:15px;">Breakdown (${report.points.length} ${report.granularity}${report.points.length === 1 ? "" : "s"})</h2>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th style="text-align:right">Revenue</th>
                <th style="text-align:right">Expenses</th>
                <th style="text-align:right">Profit</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="4" style="text-align:center;color:#9ca3af;">No data.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Print via a hidden iframe — avoids pop-up blockers and only prints
    // exactly this content, not the surrounding app.
    let iframe = document.getElementById("profit-report-print-frame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "profit-report-print-frame";
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

  const isProfitable = report && report.summary.netProfit >= 0;

  const granularityLabel = {
    day: "Daily",
    week: "Weekly",
    month: "Monthly",
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profit Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track how profit moves over time — daily, weekly, monthly, or a custom range
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-end gap-3">
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
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Generate report
          </button>
        </div>

        {error && <p className="text-sm text-rose-500 mt-3">{error}</p>}
      </div>

      {loading && !report && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your report...</p>
        </div>
      )}

      {!report && !loading && !error && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
          Pick a period and click "Generate report" to see the profit trend.
        </div>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatLKR(report.summary.revenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 mb-1">Total expenses</p>
              <p className="text-xl font-bold text-gray-900">{formatLKR(report.summary.expenses)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 mb-1">Net profit</p>
                {isProfitable ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                )}
              </div>
              <p className={`text-xl font-bold ${isProfitable ? "text-emerald-600" : "text-rose-600"}`}>
                {formatLKR(report.summary.netProfit)}
              </p>
            </div>
          </div>

          {/* Line chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-gray-900">Profit Trend</h2>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                {granularityLabel[report.granularity]} view
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {report.from} to {report.to}
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 text-sm border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-gray-700"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 text-sm border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-gray-700"
              >
                <Printer className="w-4 h-4" />
                Export PDF
              </button>
            </div>

            {report.points.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">
                No data in this period yet.
              </p>
            ) : (
              <div ref={chartWrapperRef} style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer>
                  <LineChart data={report.points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v / 1000}k`}
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#3b82f6" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#f59e0b" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="Profit"
                      stroke="#10b981"
                      strokeWidth={4}
                      dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}