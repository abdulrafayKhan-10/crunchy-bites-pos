const DbHelper = require('../../database/dbHelper');
const SettingsService = require('./settingsService');

function getBusinessDateSql(alias, businessDayStartHour) {
  return `
    COALESCE(
      ${alias}.business_date,
      CASE
        WHEN CAST(strftime('%H', ${alias}.order_date) AS INTEGER) < ${businessDayStartHour} THEN DATE(${alias}.order_date, '-1 day')
        ELSE DATE(${alias}.order_date)
      END
    )
  `;
}

function toSqlDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toCurrentBusinessDate(businessDayStartHour) {
  const now = new Date();
  if (now.getHours() < businessDayStartHour) {
    now.setDate(now.getDate() - 1);
  }
  return toSqlDate(now);
}

/**
 * Report Service
 * Generates sales reports and analytics
 */

class ReportService {
  constructor() {
    this.db = new DbHelper();
    this.settingsService = new SettingsService();
  }

  getBusinessDayStartHour() {
    return this.settingsService.getBusinessDayStartHour();
  }

  /**
   * Generate end-of-day report for a specific date
   * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
   */
  getEndOfDayReport(date = null) {
    const businessDayStartHour = this.getBusinessDayStartHour();
    const ordersBusinessDateSql = getBusinessDateSql('orders', businessDayStartHour);
    const orderAliasBusinessDateSql = getBusinessDateSql('o', businessDayStartHour);
    const targetDate = date || toCurrentBusinessDate(businessDayStartHour);

    // Get total orders and sales
    const summary = this.db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE ${ordersBusinessDateSql} = DATE(?)
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
      WHERE ${orderAliasBusinessDateSql} = DATE(?) AND oi.product_id IS NOT NULL
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
      WHERE ${orderAliasBusinessDateSql} = DATE(?) AND oi.deal_id IS NOT NULL
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
      WHERE ${ordersBusinessDateSql} = DATE(?)
      GROUP BY strftime('%H', order_date)
      ORDER BY CASE
        WHEN CAST(strftime('%H', order_date) AS INTEGER) < ${businessDayStartHour}
          THEN CAST(strftime('%H', order_date) AS INTEGER) + 24
        ELSE CAST(strftime('%H', order_date) AS INTEGER)
      END
    `).all(targetDate);

    return {
      date: targetDate,
      businessDayStartHour,
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
    const businessDayStartHour = this.getBusinessDayStartHour();
    const ordersBusinessDateSql = getBusinessDateSql('orders', businessDayStartHour);
    const orderAliasBusinessDateSql = getBusinessDateSql('o', businessDayStartHour);
    // 1. Overall Summary
    const summary = this.db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE ${ordersBusinessDateSql} BETWEEN DATE(?) AND DATE(?)
    `).get(startDate, endDate);

    // 2. Product Breakdown
    const productBreakdown = this.db.prepare(`
      SELECT 
        COALESCE(p.name, 'Unknown Product') as product_name,
        COALESCE(p.category, 'Uncategorized') as category,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total_price) as total_sales
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${orderAliasBusinessDateSql} BETWEEN DATE(?) AND DATE(?) AND oi.product_id IS NOT NULL
      GROUP BY p.id, p.name, p.category
      ORDER BY total_sales DESC
    `).all(startDate, endDate);

    // 3. Deal Breakdown
    const dealBreakdown = this.db.prepare(`
      SELECT 
        COALESCE(d.name, 'Unknown Deal') as deal_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total_price) as total_sales
      FROM order_items oi
      LEFT JOIN deals d ON oi.deal_id = d.id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${orderAliasBusinessDateSql} BETWEEN DATE(?) AND DATE(?) AND oi.deal_id IS NOT NULL
      GROUP BY d.id, d.name
      ORDER BY total_sales DESC
    `).all(startDate, endDate);

    console.log(`Report Debug [${startDate} to ${endDate}]:`);
    console.log('Summary:', summary);
    console.log('Products found:', productBreakdown.length);
    console.log('Deals found:', dealBreakdown.length);

    // 4. Individual Orders List
    const ordersList = this.db.prepare(`
      SELECT 
        orders.id,
        orders.order_date,
        orders.total_amount,
        COALESCE(customers.name, 'Walk-in') as customer_name
      FROM orders
      LEFT JOIN customers ON orders.customer_id = customers.id
      WHERE ${ordersBusinessDateSql} BETWEEN DATE(?) AND DATE(?)
      ORDER BY orders.order_date DESC
    `).all(startDate, endDate);

    return {
      startDate,
      endDate,
      businessDayStartHour,
      summary: {
        total_orders: summary.total_orders,
        total_sales: summary.total_sales
      },
      products: productBreakdown,
      deals: dealBreakdown,
      orders: ordersList
    };
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

  /**
   * Get report for date range (Cleaned up duplicate)
   */
}

module.exports = ReportService;
