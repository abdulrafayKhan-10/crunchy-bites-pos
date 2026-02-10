const DbHelper = require('../../database/dbHelper');

/**
 * Order Service
 * Handles order creation and retrieval
 */

class OrderService {
  constructor() {
    this.db = new DbHelper();
  }

  /**
   * Create new order
   * @param {Object} customerData - {name, phone, address} or null for walk-in
   * @param {Array} items - [{type: 'product'|'deal', id, quantity, price}]
   */
  createOrder(customerData, items) {
    const transaction = this.db.transaction(() => {
      let customerId = null;

      // Create customer if data provided
      if (customerData && customerData.name) {
        const customerStmt = this.db.prepare(`
          INSERT INTO customers (name, phone, address) 
          VALUES (?, ?, ?)
        `);
        const result = customerStmt.run(
          customerData.name,
          customerData.phone || null,
          customerData.address || null
        );
        customerId = result.lastInsertRowid;
      }

      // Calculate total
      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create order
      const orderStmt = this.db.prepare(`
        INSERT INTO orders (customer_id, total_amount, is_walk_in, order_date) 
        VALUES (?, ?, ?, ?)
      `);
      const orderResult = orderStmt.run(
        customerId,
        totalAmount,
        customerId ? 0 : 1,
        new Date(Date.now() + (5 * 3600000)).toISOString().replace('T', ' ').substring(0, 19) // Store Local PKT Time
      );
      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      const itemStmt = this.db.prepare(`
        INSERT INTO order_items (order_id, product_id, deal_id, quantity, unit_price, total_price) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        itemStmt.run(
          orderId,
          item.type === 'product' ? item.id : null,
          item.type === 'deal' ? item.id : null,
          item.quantity,
          item.price,
          item.price * item.quantity
        );
      }

      return orderId;
    });

    const orderId = transaction();
    return this.getOrderById(orderId);
  }

  /**
   * Get order by ID with all details
   */
  getOrderById(id) {
    const order = this.db.prepare(`
      SELECT 
        o.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(id);

    if (!order) return null;

    // Get order items
    const items = this.db.prepare(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.category as product_category,
        d.name as deal_name,
        d.description as deal_description
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN deals d ON oi.deal_id = d.id
      WHERE oi.order_id = ?
    `).all(id);

    return {
      ...order,
      items
    };
  }

  /**
   * Get all orders for today
   */
  getTodayOrders() {
    const stmt = this.db.prepare(`
      SELECT 
        o.*,
        c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE DATE(order_date) = DATE('now', 'localtime')
      ORDER BY o.order_date DESC
    `);
    return stmt.all();
  }

  /**
   * Get orders by date
   */
  getOrdersByDate(date) {
    const stmt = this.db.prepare(`
      SELECT 
        o.*,
        c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE DATE(o.order_date) = DATE(?)
      ORDER BY o.order_date DESC
    `);
    return stmt.all(date);
  }

  /**
   * Get all orders
   */
  getAllOrders(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT 
        o.*,
        c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.order_date DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }
}

module.exports = OrderService;
