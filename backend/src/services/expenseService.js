// services/expenseService.js
const supabase = require('../config/db');

const expenseService = {
  async getAllExpenses(filters = {}) {
    let query = supabase
      .from('expenses')
      .select('*')
      .neq('category', 'SALARY')
      .order('recorded_at', { ascending: false });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.dateFrom) {
      query = query.gte('recorded_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('recorded_at', filters.dateTo);
    }
    if (filters.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getExpenseById(id) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createExpense(expenseData) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          category: expenseData.category,
          description: expenseData.description,
          amount: expenseData.amount,
          recorded_at: expenseData.date || new Date().toISOString(),
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateExpense(id, updatedFields) {
    const payload = {};
    if (updatedFields.category !== undefined) payload.category = updatedFields.category;
    if (updatedFields.description !== undefined) payload.description = updatedFields.description;
    if (updatedFields.amount !== undefined) payload.amount = updatedFields.amount;
    if (updatedFields.date !== undefined) payload.recorded_at = updatedFields.date;

    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async voidExpense(id, reason) {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        voided: true,
        void_reason: reason,
        voided_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

module.exports = { expenseService };