const DbHelper = require('../../database/dbHelper');

/**
 * Product Service
 * Handles all product-related database operations
 */

class ProductService {
  constructor() {
    this.db = new DbHelper();
  }

  /**
   * Get all active products
   */
  getAllProducts() {
    const stmt = this.db.prepare(`
      SELECT * FROM products 
      WHERE is_active = 1 
      ORDER BY category, name
    `);
    return stmt.all();
  }

  /**
   * Get product by ID
   */
  getProductById(id) {
    const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
    return stmt.get(id);
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category) {
    const stmt = this.db.prepare(`
      SELECT * FROM products 
      WHERE category = ? AND is_active = 1 
      ORDER BY name
    `);
    return stmt.all(category);
  }

  /**
   * Create new product
   */
  createProduct(data) {
    const stmt = this.db.prepare(`
      INSERT INTO products (name, category, price) 
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.name, data.category, data.price);
    return this.getProductById(result.lastInsertRowid);
  }

  /**
   * Update product
   */
  updateProduct(id, data) {
    const stmt = this.db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, price = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(data.name, data.category, data.price, id);
    return this.getProductById(id);
  }

  /**
   * Soft delete product (set is_active to 0)
   */
  deleteProduct(id) {
    const stmt = this.db.prepare(`
      UPDATE products 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    return stmt.run(id);
  }

  /**
   * Get all categories
   */
  getCategories() {
    const stmt = this.db.prepare(`
      SELECT DISTINCT category 
      FROM products 
      WHERE is_active = 1 AND category IS NOT NULL
      ORDER BY category
    `);
    return stmt.all().map(row => row.category);
  }
}

module.exports = ProductService;
