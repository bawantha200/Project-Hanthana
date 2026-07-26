const supabase = require("../config/db");

// GET invoice list, joined with order info (customer, payment status/method)
async function getInvoices({ dateFrom, dateTo, paymentStatus } = {}) {
  let query = supabase
    .from("invoices")
    .select(
      `id, invoice_number, total_amount, tax_amount, issued_at, order_id,
       orders ( id, payment_status, payment_method, order_status, users ( name, phone ) )`
    )
    .order("issued_at", { ascending: false });

  if (dateFrom) query = query.gte("issued_at", dateFrom);
  if (dateTo) query = query.lte("issued_at", dateTo);

  const { data, error } = await query;
  if (error) throw error;

  let results = data.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    orderId: inv.order_id,
    customer: inv.orders?.users?.name,
    amount: Number(inv.total_amount),
    tax: Number(inv.tax_amount),
    date: inv.issued_at,
    paymentStatus: inv.orders?.payment_status, // PENDING | PAID
    paymentMethod: inv.orders?.payment_method, // ONLINE | CASH
  }));

  if (paymentStatus && paymentStatus !== "All") {
    results = results.filter((r) => r.paymentStatus === paymentStatus);
  }
  return results;
}

// GET single invoice with line items (from order_items -> products)
async function getInvoiceDetail(invoiceId) {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      `id, invoice_number, total_amount, tax_amount, issued_at, order_id,
       orders ( id, payment_status, payment_method, delivery_location, users ( name, phone ) )`
    )
    .eq("id", invoiceId)
    .single();
  if (error) throw error;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(`id, quantity, sub_total, products ( name, unit_price )`)
    .eq("order_id", invoice.order_id);
  if (itemsError) throw itemsError;

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    orderId: invoice.order_id,
    customer: invoice.orders?.users?.name,
    paymentStatus: invoice.orders?.payment_status,
    paymentMethod: invoice.orders?.payment_method,
    date: invoice.issued_at,
    amount: Number(invoice.total_amount),
    tax: Number(invoice.tax_amount),
    items: items.map((it) => ({
      name: it.products?.name,
      qty: it.quantity,
      unitPrice: it.products?.unit_price,
      total: Number(it.sub_total),
    })),
  };
}

// POST manually trigger invoice generation for an order (fallback to the DB trigger)
async function generateInvoiceForOrder(orderId) {
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) return existing;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total_amount, order_status")
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;

  if (order.order_status !== "DELIVERED") {
    const err = new Error("Order must be DELIVERED before an invoice can be generated");
    err.status = 400;
    throw err;
  }

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(orderId).padStart(4, "0")}`;
  const { data, error } = await supabase
    .from("invoices")
    .insert({ order_id: orderId, invoice_number: invoiceNumber, total_amount: order.total_amount, tax_amount: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// GET revenue/expenses/profit report for a date range
async function getFinancialReport({ dateFrom, dateTo }) {
  // A plain date like "2026-07-18" means midnight — without this, it would
  // exclude every invoice created later that same day. Push it to day's end.
  const dateToInclusive = dateTo ? `${dateTo}T23:59:59.999` : null;

  let query = supabase
    .from("invoices")
    .select(`total_amount, issued_at, orders ( payment_status, payment_method )`);
  if (dateFrom) query = query.gte("issued_at", dateFrom);
  if (dateToInclusive) query = query.lte("issued_at", dateToInclusive);

  const { data, error } = await query;
  if (error) throw error;

  let revenue = 0;
  let pendingPayments = 0;
  const byPaymentType = { ONLINE: 0, CASH: 0 };
  data.forEach((inv) => {
    const status = (inv.orders?.payment_status || "").toUpperCase();
    if (status === "PAID" || status === "COMPLETED") {
      revenue += Number(inv.total_amount);
      const method = inv.orders.payment_method;
      byPaymentType[method] = (byPaymentType[method] || 0) + Number(inv.total_amount);
    } else {
      pendingPayments += Number(inv.total_amount);
    }
  });

  // Expenses for the same period, from the expenses table (see expenseService.js)
  let expenseQuery = supabase.from("expenses").select("amount").eq("voided", false);
  if (dateFrom) expenseQuery = expenseQuery.gte("recorded_at", dateFrom);
  if (dateToInclusive) expenseQuery = expenseQuery.lte("recorded_at", dateToInclusive);
  const { data: expenseRows, error: expenseError } = await expenseQuery;
  if (expenseError) throw expenseError;
  const expenses = expenseRows.reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
    pendingPayments,
    byPaymentType,
    invoiceCount: data.length,
  };
}

// GET total outstanding dues across ALL invoices, regardless of date —
// this is what "Pending Payments" on the dashboard should mean: every
// delivered-but-unpaid order, not just ones from the current month.
async function getPendingPaymentsTotal() {
  const { data, error } = await supabase
    .from("invoices")
    .select(`total_amount, orders ( payment_status )`);
  if (error) throw error;

  return data.reduce((sum, inv) => {
    const status = (inv.orders?.payment_status || "").toUpperCase();
    const isPaid = status === "PAID" || status === "COMPLETED";
    return isPaid ? sum : sum + Number(inv.total_amount);
  }, 0);
}

// GET revenue grouped by month, for the last N months (default 6) —
// used for the Revenue Growth chart.
// Your system went live in May 2026 — no point showing empty months before that.
const SYSTEM_START_YEAR = 2026;
const SYSTEM_START_MONTH = 5; // May, 1-indexed

async function getMonthlyRevenueHistory() {
  const { data, error } = await supabase
    .from("invoices")
    .select(`total_amount, issued_at, orders ( payment_status )`);
  if (error) throw error;

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();

  // Count months from system start up to and including the current month
  const monthsSinceStart =
    (now.getFullYear() - SYSTEM_START_YEAR) * 12 + (now.getMonth() + 1 - SYSTEM_START_MONTH) + 1;

  const months = [];
  for (let i = monthsSinceStart - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      month: monthNames[d.getMonth()],
      income: 0,
    });
  }
  const monthMap = Object.fromEntries(months.map((m) => [m.key, m]));

  data.forEach((inv) => {
    const status = (inv.orders?.payment_status || "").toUpperCase();
    if (status !== "PAID" && status !== "COMPLETED") return;
    const key = inv.issued_at.slice(0, 7); // "2026-07"
    if (monthMap[key]) monthMap[key].income += Number(inv.total_amount);
  });

  return months.map(({ month, income }) => ({ month, income }));
}

module.exports = {
  getInvoices,
  getInvoiceDetail,
  generateInvoiceForOrder,
  getFinancialReport,
  getPendingPaymentsTotal,
  getMonthlyRevenueHistory,
};