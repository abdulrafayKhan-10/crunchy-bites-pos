const DbHelper = require('../../database/dbHelper');

/**
 * Deal Service
 * Handles all deal-related database operations
 */

class DealService {
    constructor() {
        this.db = new DbHelper();
    }

    /**
     * Get all active deals with their items
     */
    getAllDeals() {
        const deals = this.db.prepare(`
      SELECT * FROM deals 
      WHERE is_active = 1 
      ORDER BY name
    `).all();

        // Get items for each deal
        return deals.map(deal => ({
            ...deal,
            items: this.getDealItems(deal.id)
        }));
    }

    /**
     * Get deal by ID with items
     */
    getDealById(id) {
        const deal = this.db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
        if (!deal) return null;

        return {
            ...deal,
            items: this.getDealItems(id)
        };
    }

    /**
     * Get items for a specific deal
     */
    getDealItems(dealId) {
        const stmt = this.db.prepare(`
      SELECT 
        di.id,
        di.quantity,
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.price
      FROM deal_items di
      JOIN products p ON di.product_id = p.id
      WHERE di.deal_id = ?
    `);
        return stmt.all(dealId);
    }

    /**
     * Create new deal with items
     * @param {Object} dealData - {name, description, price}
     * @param {Array} items - [{product_id, quantity}]
     */
    createDeal(dealData, items) {
        try {
            console.log('DealService: Creating deal', dealData, items);
            const transaction = this.db.transaction(() => {
                // Insert deal
                const dealStmt = this.db.prepare(`
            INSERT INTO deals (name, description, price) 
            VALUES (?, ?, ?)
          `);
                const result = dealStmt.run(dealData.name, dealData.description, dealData.price);
                const dealId = result.lastInsertRowid;
                console.log('DealService: Inserted deal', dealId);

                // Insert deal items
                const itemStmt = this.db.prepare(`
            INSERT INTO deal_items (deal_id, product_id, quantity) 
            VALUES (?, ?, ?)
          `);

                for (const item of items) {
                    itemStmt.run(dealId, item.product_id, item.quantity);
                }
                console.log('DealService: Inserted items');

                return dealId;
            });

            const dealId = transaction();
            return this.getDealById(dealId);
        } catch (error) {
            console.error('DealService Error:', error);
            throw error; // Re-throw to be caught by handler
        }
    }

    /**
     * Update deal and its items
     */
    updateDeal(id, dealData, items) {
        const transaction = this.db.transaction(() => {
            // Update deal
            const dealStmt = this.db.prepare(`
        UPDATE deals 
        SET name = ?, description = ?, price = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
            dealStmt.run(dealData.name, dealData.description, dealData.price, id);

            // Delete existing items
            const deleteStmt = this.db.prepare('DELETE FROM deal_items WHERE deal_id = ?');
            deleteStmt.run(id);

            // Insert new items
            const itemStmt = this.db.prepare(`
        INSERT INTO deal_items (deal_id, product_id, quantity) 
        VALUES (?, ?, ?)
      `);

            for (const item of items) {
                itemStmt.run(id, item.product_id, item.quantity);
            }
        });

        transaction();
        return this.getDealById(id);
    }

    /**
     * Soft delete deal
     */
    deleteDeal(id) {
        const stmt = this.db.prepare(`
      UPDATE deals 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
        return stmt.run(id);
    }
}

module.exports = DealService;
