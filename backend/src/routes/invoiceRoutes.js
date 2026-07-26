const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoiceController");
// const { requireAuth } = require("../middlewares/authMiddleware");
// router.use(requireAuth);

router.get("/report", invoiceController.financialReport); // put before /:id so it isn't swallowed as an id
router.get("/pending-payments", invoiceController.pendingPayments);
router.get("/monthly-revenue", invoiceController.monthlyRevenue);
router.get("/", invoiceController.listInvoices);
router.get("/:id", invoiceController.getInvoice);
router.post("/generate/:orderId", invoiceController.generateInvoice);

module.exports = router;
