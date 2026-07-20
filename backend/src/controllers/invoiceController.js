const invoiceService = require("../services/invoiceService");

// GET /api/invoices?dateFrom=&dateTo=&paymentStatus=
async function listInvoices(req, res) {
  try {
    const { dateFrom, dateTo, paymentStatus } = req.query;
    const invoices = await invoiceService.getInvoices({ dateFrom, dateTo, paymentStatus });
    res.json(invoices);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// GET /api/invoices/:id
async function getInvoice(req, res) {
  try {
    const invoice = await invoiceService.getInvoiceDetail(req.params.id);
    res.json(invoice);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// POST /api/invoices/generate/:orderId  (manual fallback — the DB trigger normally handles this)
async function generateInvoice(req, res) {
  try {
    const invoice = await invoiceService.generateInvoiceForOrder(req.params.orderId);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// GET /api/invoices/report?dateFrom=&dateTo=
async function financialReport(req, res) {
  try {
    const { dateFrom, dateTo } = req.query;
    const report = await invoiceService.getFinancialReport({ dateFrom, dateTo });
    res.json(report);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = { listInvoices, getInvoice, generateInvoice, financialReport };
