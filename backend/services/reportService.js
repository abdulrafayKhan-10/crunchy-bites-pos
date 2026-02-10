const DbHelper = require('../../database/dbHelper');

/**
 * Report Service
 * Generates sales reports and analytics
 */

class ReportService {
  constructor() {
    this.db = new DbHelper();
  }

  /**
   * Generate end-of-day report for a specific date
   * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
   */
  getEndOfDayReport(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get total orders and sales
    const summary = this.db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE DATE(order_date) = DATE(?)
    `).get(targetDate);

    // Get product-wise breakdown
    const productBreakdown = this.db.prepare(`
      SELECT 
        p.name as product_name,
        p.category,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total_price) as total_sales
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.order_date) = DATE(?) AND oi.product_id IS NOT NULL
      GROUP BY p.id, p.name, p.category
      ORDER BY total_sales DESC
    `).all(targetDate);

    // Get deal-wise breakdown
    const dealBreakdown = this.db.prepare(`
      SELECT 
        d.name as deal_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total_price) as total_sales
      FROM order_items oi
      JOIN deals d ON oi.deal_id = d.id
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.order_date) = DATE(?) AND oi.deal_id IS NOT NULL
      GROUP BY d.id, d.name
      ORDER BY total_sales DESC
    `).all(targetDate);

    // Get hourly breakdown
    const hourlyBreakdown = this.db.prepare(`
      SELECT 
        strftime('%H:00', order_date) as hour,
        COUNT(*) as order_count,
        SUM(total_amount) as sales
      FROM orders
      WHERE DATE(order_date) = DATE(?)
      GROUP BY strftime('%H', order_date)
      ORDER BY hour
    `).all(targetDate);

    return {
      date: targetDate,
      summary: {
        total_orders: summary.total_orders,
        total_sales: summary.total_sales
      },
      products: productBreakdown,
      deals: dealBreakdown,
      hourly: hourlyBreakdown
    };
  }

  /**
   * Get sales summary for a date range
   */
  getDateRangeReport(startDate, endDate) {
    const summary = this.db.prepare(`
      SELECT 
        DATE(order_date) as date,
        COUNT(*) as total_orders,
        SUM(total_amount) as total_sales
      FROM orders
      WHERE DATE(order_date) BETWEEN DATE(?) AND DATE(?)
      GROUP BY DATE(order_date)
      ORDER BY date DESC
    `).all(startDate, endDate);

    return summary;
  }

  /**
   * Get top selling products
   */
  getTopProducts(limit = 10) {
    return this.db.prepare(`
      SELECT 
        p.name,
        p.category,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.product_id IS NOT NULL
      GROUP BY p.id
      ORDER BY total_revenue DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Get top selling deals
   */
  getTopDeals(limit = 10) {
    return this.db.prepare(`
      SELECT 
        d.name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue
      FROM order_items oi
      JOIN deals d ON oi.deal_id = d.id
      WHERE oi.deal_id IS NOT NULL
      GROUP BY d.id
      ORDER BY total_revenue DESC
      LIMIT ?
    `).all(limit);
  }
}

module.exports = ReportService;
