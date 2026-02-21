const DbHelper = require('../../database/dbHelper');

/**
 * Expense Service
 * Handles expense tracking and management
 */
class ExpenseService {
    constructor() {
        this.db = new DbHelper();
    }

    /**
     * Add new expense
     * @param {Object} expenseData - {description, amount, quantity, category, date}
     */
    addExpense(expenseData) {
        const stmt = this.db.prepare(`
      INSERT INTO expenses (description, amount, quantity, unit, category, date) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        // Default date to now if not provided
        const date = expenseData.date ? new Date(expenseData.date).toISOString() : new Date().toISOString();

        // Ensure quantity defaults to 1 if not provided or invalid
        const quantity = expenseData.quantity || 1;

        const result = stmt.run(
            expenseData.description,
            expenseData.amount,
            quantity,
            expenseData.unit || '',
            expenseData.category || 'General',
            date
        );

        return { id: result.lastInsertRowid, ...expenseData, date, quantity };
    }

    /**
     * Delete expense by ID
     */
    deleteExpense(id) {
        const stmt = this.db.prepare('DELETE FROM expenses WHERE id = ?');
        const result = stmt.run(id);
        if (result.changes === 0) {
            throw new Error('Expense not found');
        }
        return true;
    }

    /**
     * Update expense by ID
     * @param {number} id - Expense ID
     * @param {Object} data - {description, amount, quantity, unit, category, date}
     */
    updateExpense(id, data) {
        const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
        const quantity = data.quantity || 1;

        const stmt = this.db.prepare(`
            UPDATE expenses 
            SET description = ?, amount = ?, quantity = ?, unit = ?, category = ?, date = ?
            WHERE id = ?
        `);
        const result = stmt.run(
            data.description,
            data.amount,
            quantity,
            data.unit || '',
            data.category || 'General',
            date,
            id
        );
        if (result.changes === 0) {
            throw new Error('Expense not found');
        }
        return { id, ...data, date, quantity };
    }

    /**
     * Get expenses by date (defaults to today)
     */
    getExpensesByDate(date) {
        // If no date provided, use today
        const queryDate = date ? new Date(date) : new Date();
        const dateStr = queryDate.toISOString().split('T')[0];

        const stmt = this.db.prepare(`
      SELECT * FROM expenses 
      WHERE DATE(date) = ? 
      ORDER BY date DESC
    `);

        return stmt.all(dateStr);
    }

    /**
     * Get expenses by date range
     */
    getExpensesByRange(startDate, endDate) {
        const start = new Date(startDate).toISOString().split('T')[0];
        const end = new Date(endDate).toISOString().split('T')[0];

        const stmt = this.db.prepare(`
      SELECT * FROM expenses 
      WHERE DATE(date) BETWEEN ? AND ? 
      ORDER BY date DESC
    `);

        return stmt.all(start, end);
    }

    /**
     * Get total expenses for a specific date
     */
    getTotalExpensesByDate(date) {
        const queryDate = date ? new Date(date) : new Date();
        const dateStr = queryDate.toISOString().split('T')[0];

        const stmt = this.db.prepare(`
      SELECT SUM(amount) as total FROM expenses 
      WHERE DATE(date) = ?
    `);

        const result = stmt.get(dateStr);
        return result.total || 0;
    }
    /**
     * Get all expenses
     */
    getAllExpenses() {
        const stmt = this.db.prepare(`
      SELECT * FROM expenses 
      ORDER BY date DESC
    `);
        return stmt.all();
    }
}

module.exports = ExpenseService;
