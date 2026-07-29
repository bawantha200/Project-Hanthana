const express = require('express');
const router = express.Router();
const invoiceService = require('../services/invoiceService');

/**
 * Generate and save a profit report
 * POST /api/financial-summaries/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo are required' });
    }

    // Object argument — this was the bug that silently ignored your date range
    const profitData = await invoiceService.getProfitTrend({
      dateFrom,
      dateTo,
      saveToDatabase: true
    });

    if (!profitData.savedSummary) {
      // getProfitTrend logs the real DB error already; surface a clear message here
      return res.status(500).json({ error: 'Report generated but could not be saved to financial_summaries' });
    }

    res.status(201).json({
      message: 'Financial summary saved successfully',
      summary: profitData.savedSummary,
      report: profitData
    });
  } catch (error) {
    console.error('Error generating financial summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/financial-summaries
 */
router.get('/', async (req, res) => {
  try {
    const { limit, offset, period } = req.query;
    const result = await invoiceService.getFinancialSummaries({
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      period
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/financial-summaries/stats/aggregated
 * NOTE: this must come before /:id or "stats" will be treated as an id
 */
router.get('/stats/aggregated', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required' });
    }
    const stats = await invoiceService.getAggregatedFinancialStats({ fromDate, toDate });
    res.json(stats);
  } catch (error) {
    console.error('Error fetching aggregated stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/financial-summaries/range
 * NOTE: this must also come before /:id
 */
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const summaries = await invoiceService.getSummariesByDateRange(startDate, endDate);
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching summaries by range:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/financial-summaries/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const summary = await invoiceService.getSummaryById(req.params.id);
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;