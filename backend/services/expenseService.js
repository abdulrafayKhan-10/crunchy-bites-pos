const DbHelper = require('../../database/dbHelper');
const SettingsService = require('./settingsService');

function toSqlDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
}

function getExpenseBusinessDateSql(businessDayStartHour) {
        return `
            COALESCE(
                business_date,
                CASE
                    WHEN CAST(strftime('%H', date) AS INTEGER) < ${businessDayStartHour} THEN DATE(date, '-1 day')
                    ELSE DATE(date)
                END
            )
        `;
}

function toBusinessDate(date, businessDayStartHour) {
        const businessDate = new Date(date);
        if (businessDate.getHours() < businessDayStartHour) {
                businessDate.setDate(businessDate.getDate() - 1);
        }
        return toSqlDate(businessDate);
}

/**
 * Expense Service
 * Handles expense tracking and management
 */
class ExpenseService {
    constructor() {
        this.db = new DbHelper();
        this.settingsService = new SettingsService();
    }

    getBusinessDayStartHour() {
        return this.settingsService.getBusinessDayStartHour();
    }

    /**
     * Add new expense
     * @param {Object} expenseData - {description, amount, quantity, category, date}
     */
    addExpense(expenseData) {
                const businessDayStartHour = this.getBusinessDayStartHour();
        const stmt = this.db.prepare(`
            INSERT INTO expenses (description, amount, quantity, unit, category, date, business_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        // Default date to now if not provided
        const date = expenseData.date ? new Date(expenseData.date).toISOString() : new Date().toISOString();
                const businessDate = toBusinessDate(new Date(date), businessDayStartHour);

        // Ensure quantity defaults to 1 if not provided or invalid
        const quantity = expenseData.quantity || 1;

        const result = stmt.run(
            expenseData.description,
            expenseData.amount,
            quantity,
            expenseData.unit || '',
            expenseData.category || 'General',
            date,
            businessDate
        );

        return { id: result.lastInsertRowid, ...expenseData, date, quantity, business_date: businessDate };
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
        const businessDayStartHour = this.getBusinessDayStartHour();
        const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
        const businessDate = toBusinessDate(new Date(date), businessDayStartHour);
        const quantity = data.quantity || 1;

        const stmt = this.db.prepare(`
            UPDATE expenses 
            SET description = ?, amount = ?, quantity = ?, unit = ?, category = ?, date = ?, business_date = ?
            WHERE id = ?
        `);
        const result = stmt.run(
            data.description,
            data.amount,
            quantity,
            data.unit || '',
            data.category || 'General',
            date,
            businessDate,
            id
        );
        if (result.changes === 0) {
            throw new Error('Expense not found');
        }
        return { id, ...data, date, quantity, business_date: businessDate };
    }

    /**
     * Get expenses by date (defaults to today)
     */
    getExpensesByDate(date) {
                const businessDayStartHour = this.getBusinessDayStartHour();
                const queryDate = date ? new Date(date) : new Date();
                const dateStr = toBusinessDate(queryDate, businessDayStartHour);
                const businessDateSql = getExpenseBusinessDateSql(businessDayStartHour);

        const stmt = this.db.prepare(`
      SELECT * FROM expenses 
            WHERE ${businessDateSql} = DATE(?) 
      ORDER BY date DESC
    `);

        return stmt.all(dateStr);
    }

    /**
     * Get expenses by date range
     */
    getExpensesByRange(startDate, endDate) {
                const businessDayStartHour = this.getBusinessDayStartHour();
                const businessDateSql = getExpenseBusinessDateSql(businessDayStartHour);

        const stmt = this.db.prepare(`
      SELECT * FROM expenses 
            WHERE ${businessDateSql} BETWEEN DATE(?) AND DATE(?) 
      ORDER BY date DESC
    `);

                return stmt.all(startDate, endDate);
    }

    /**
     * Get total expenses for a specific date
     */
    getTotalExpensesByDate(date) {
                const businessDayStartHour = this.getBusinessDayStartHour();
                const queryDate = date ? new Date(date) : new Date();
                const dateStr = toBusinessDate(queryDate, businessDayStartHour);
                const businessDateSql = getExpenseBusinessDateSql(businessDayStartHour);

        const stmt = this.db.prepare(`
      SELECT SUM(amount) as total FROM expenses 
            WHERE ${businessDateSql} = DATE(?)
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
