// controllers/expenseController.js
const { expenseService } = require('../services/expenseService');

const VALID_CATEGORIES = [ 'VEHICLE', 'DELIVERY_COST', 'UTILITY', 'MAINTENANCE', 'OFFICE_SUPPLIES', 'ADVERTISING', 'OTHER'];

const expenseController = {
  async getExpenses(req, res) {
    try {
      const { category, dateFrom, dateTo, search } = req.query;
      const expenses = await expenseService.getAllExpenses({ category, dateFrom, dateTo, search });
      res.status(200).json(expenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  },

  async getExpense(req, res) {
    try {
      const { id } = req.params;
      const expenseId = parseInt(id, 10);
      if (isNaN(expenseId)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }
      const expense = await expenseService.getExpenseById(expenseId);
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      res.status(200).json(expense);
    } catch (error) {
      console.error('Error fetching expense:', error);
      res.status(500).json({ error: 'Failed to fetch expense' });
    }
  },

  async createExpense(req, res) {
    try {
      const expenseData = req.body;
      if (!expenseData.category || !expenseData.description || !expenseData.amount) {
        return res.status(400).json({ error: 'category, description, and amount are required' });
      }
      if (!VALID_CATEGORIES.includes(expenseData.category)) {
        return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      const newExpense = await expenseService.createExpense(expenseData);
      res.status(201).json(newExpense);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  },

  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const expenseId = parseInt(id, 10);
      if (isNaN(expenseId)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }
      if (req.body.category && !VALID_CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      const updated = await expenseService.updateExpense(expenseId, req.body);
      res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  },

  async voidExpense(req, res) {
    try {
      const { id } = req.params;
      const expenseId = parseInt(id, 10);
      if (isNaN(expenseId)) {
        return res.status(400).json({ error: 'Invalid expense ID' });
      }
      const { reason } = req.body;
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Void reason is required' });
      }
      const voided = await expenseService.voidExpense(expenseId, reason);
      res.status(200).json(voided);
    } catch (error) {
      console.error('Error voiding expense:', error);
      res.status(500).json({ error: 'Failed to void expense' });
    }
  },
};

module.exports = { expenseController };