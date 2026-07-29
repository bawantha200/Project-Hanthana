// const pool = require('../config/database');

// class FinancialSummaryService {
//   /**
//    * Save a financial summary to the database
//    */
//   async saveSummary({ 
//     reportDate, 
//     totalRevenue, 
//     totalExpenses, 
//     netProfit, 
//     periodStart,
//     periodEnd
//   }) {
//     const query = `
//       INSERT INTO financial_summaries (
//         report_date,
//         total_revenue,
//         total_expenses,
//         net_profit,
//         period_start,
//         period_end
//       ) VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING id
//     `;

//     const values = [
//       reportDate || new Date(),
//       totalRevenue,
//       totalExpenses,
//       netProfit,
//       periodStart,
//       periodEnd
//     ];

//     try {
//       const result = await pool.query(query, values);
//       return result.rows[0].id;
//     } catch (error) {
//       console.error('Error saving financial summary:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get historical summaries with pagination
//    */
//   async getSummaries({ 
//     limit = 50, 
//     offset = 0, 
//     fromDate = null,
//     toDate = null,
//     period = null
//   }) {
//     let query = `
//       SELECT 
//         id,
//         report_date,
//         total_revenue,
//         total_expenses,
//         net_profit,
//         period_start,
//         period_end,
//         period
//       FROM financial_summaries
//       WHERE 1=1
//     `;
    
//     const values = [];
//     let paramCount = 1;

//     if (period) {
//       query += ` AND period = $${paramCount}`;
//       values.push(period.toUpperCase());
//       paramCount++;
//     }

//     if (fromDate) {
//       query += ` AND period_start >= $${paramCount}`;
//       values.push(fromDate);
//       paramCount++;
//     }

//     if (toDate) {
//       query += ` AND period_end <= $${paramCount}`;
//       values.push(toDate);
//       paramCount++;
//     }

//     query += ` ORDER BY period_start DESC, id DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
//     values.push(limit, offset);

//     try {
//       const result = await pool.query(query, values);
//       return result.rows;
//     } catch (error) {
//       console.error('Error fetching summaries:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get a specific summary by ID
//    */
//   async getSummaryById(id) {
//     const query = `
//       SELECT 
//         id,
//         report_date,
//         total_revenue,
//         total_expenses,
//         net_profit,
//         period_start,
//         period_end,
//         period
//       FROM financial_summaries
//       WHERE id = $1
//     `;

//     try {
//       const result = await pool.query(query, [id]);
//       return result.rows[0];
//     } catch (error) {
//       console.error('Error fetching summary:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get aggregated stats
//    */
//   async getAggregatedStats({ fromDate, toDate }) {
//     const query = `
//       SELECT 
//         COUNT(*) as total_reports,
//         SUM(total_revenue) as total_revenue,
//         SUM(total_expenses) as total_expenses,
//         SUM(net_profit) as total_profit,
//         AVG(net_profit) as avg_profit,
//         MAX(net_profit) as max_profit,
//         MIN(net_profit) as min_profit
//       FROM financial_summaries
//       WHERE period_start >= $1 AND period_end <= $2
//     `;

//     try {
//       const result = await pool.query(query, [fromDate, toDate]);
//       return result.rows[0];
//     } catch (error) {
//       console.error('Error fetching aggregated stats:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get summaries by date range
//    */
//   async getSummariesByDateRange(startDate, endDate) {
//     const query = `
//       SELECT 
//         id,
//         report_date,
//         total_revenue,
//         total_expenses,
//         net_profit,
//         period_start,
//         period_end,
//         period
//       FROM financial_summaries
//       WHERE period_start >= $1 AND period_end <= $2
//       ORDER BY period_start DESC
//     `;

//     try {
//       const result = await pool.query(query, [startDate, endDate]);
//       return result.rows;

//     } catch (error) {
//       console.error('Error fetching summaries by date range:', error);
//       throw error;
//     }
//   }
// }

// module.exports = new FinancialSummaryService();