const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Database initialization and connection management using sql.js
 * Auto-creates database file and tables on first run
 */

let db = null;
let SQL = null;

async function initDatabase() {
  try {
    // Initialize sql.js with wasm file location
    const wasmBinary = fs.readFileSync(
      path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm')
    );

    SQL = await initSqlJs({
      wasmBinary
    });

    // Get user data path for storing database
    const userDataPath = app.getPath('userData');

    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    const dbPath = path.join(userDataPath, 'crunchy-bites.db');

    console.log(`Initializing database at: ${dbPath}`);

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Create tables
    createTables();

    // Insert sample data if database is empty
    initializeSampleData();

    // Save database to file
    saveDatabase(dbPath);

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

function createTables() {
  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      price REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Deals table
  db.run(`
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Deal items junction table
  db.run(`
    CREATE TABLE IF NOT EXISTS deal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Customers table
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      total_amount REAL NOT NULL,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_walk_in INTEGER DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Order items table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      deal_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (deal_id) REFERENCES deals(id)
    )
  `);

  console.log('All tables created successfully');
}

function initializeSampleData() {
  // Check if products table is empty
  const result = db.exec('SELECT COUNT(*) as count FROM products');
  const productCount = result[0]?.values[0]?.[0] || 0;

  if (productCount === 0) {
    console.log('Inserting Crunchy Bites menu data...');

    // Crunchy Bites Products
    const products = [
      // Burgers/Zingers
      { name: 'Zinger Regular', category: 'Burgers', price: 200 },
      { name: 'Zinger Cheese', category: 'Burgers', price: 250 },
      { name: 'Zinger Jumbo', category: 'Burgers', price: 450 },

      // Broast
      { name: 'Broast Chest', category: 'Broast', price: 400 },
      { name: 'Broast Leg', category: 'Broast', price: 350 },
      { name: 'Cheesey Broast', category: 'Broast', price: 450 },
      { name: 'Drum Stick', category: 'Broast', price: 450 },
      { name: 'Korean Broast', category: 'Broast', price: 450 },

      // Wings
      { name: 'Fried Wings', category: 'Wings', price: 350 },
      { name: 'Korean Wings', category: 'Wings', price: 450 },

      // Fries
      { name: 'Fries Plain', category: 'Fries', price: 100 },
      { name: 'Fries Mayo', category: 'Fries', price: 150 },
      { name: 'Fries Loaded', category: 'Fries', price: 250 },
      { name: 'Fries Cheesey', category: 'Fries', price: 200 },
      { name: 'Fries Pizza (L)', category: 'Fries', price: 450 },
      { name: 'Fries Pizza (S)', category: 'Fries', price: 300 },
    ];

    // Insert products and track IDs
    const productIds = {};
    products.forEach(product => {
      db.run('INSERT INTO products (name, category, price) VALUES (?, ?, ?)',
        [product.name, product.category, product.price]);
      const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
      productIds[product.name] = id;
    });

    console.log(`Inserted ${products.length} products`);

    // Crunchy Bites Deals
    const deals = [
      {
        name: 'Deal 1',
        description: '1 Broast Leg, 1 Zinger Regular, Fries,Coleslaw, 500ml Drink',
        price: 650,
        items: [
          { name: 'Broast Leg', quantity: 1 },
          { name: 'Zinger Regular', quantity: 1 },
          { name: 'Fries Plain', quantity: 1 }
        ]
      },
      {
        name: 'Deal 2',
        description: '2 Zinger Regular, 1 Broast Leg, Fries, Coleslaw, 500ml Drink',
        price: 850,
        items: [
          { name: 'Zinger Regular', quantity: 2 },
          { name: 'Broast Leg', quantity: 1 },
          { name: 'Fries Plain', quantity: 1 }
        ]
      },
      {
        name: 'Deal 3',
        description: '1 Zinger Regular, 1 Pizza Fries (L), 1 Broast Leg, 500ml Drink',
        price: 900,
        items: [
          { name: 'Zinger Regular', quantity: 1 },
          { name: 'Fries Pizza (L)', quantity: 1 },
          { name: 'Broast Leg', quantity: 1 }
        ]
      },
      {
        name: 'Deal 4 - Family Deal',
        description: '2 Zinger Regular/2 Broast Leg, 2 Pizza Fries (L), Fries Plain / Coleslaw , 1.5ltr Drink',
        price: 1800,
        items: [
          { name: 'Zinger Regular', quantity: 2 },
          { name: 'Broast Leg', quantity: 2 },
          { name: 'Fries Pizza (L)', quantity: 2 },
          { name: 'Fries Plain', quantity: 1 }
        ]
      }
    ];

    // Insert deals and deal items
    deals.forEach(deal => {
      db.run('INSERT INTO deals (name, description, price) VALUES (?, ?, ?)',
        [deal.name, deal.description, deal.price]);
      const dealId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

      // Insert deal items
      deal.items.forEach(item => {
        const productId = productIds[item.name];
        if (productId) {
          db.run('INSERT INTO deal_items (deal_id, product_id, quantity) VALUES (?, ?, ?)',
            [dealId, productId, item.quantity]);
        }
      });
    });

    console.log(`Inserted ${deals.length} deals`);

    // Save after inserting data
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'crunchy-bites.db');
    saveDatabase(dbPath);

    console.log('Crunchy Bites menu data inserted successfully');
  }
}

function saveDatabase(dbPath) {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    // Save before closing
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'crunchy-bites.db');
    saveDatabase(dbPath);

    db.close();
    console.log('Database connection closed');
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  saveDatabase
};
