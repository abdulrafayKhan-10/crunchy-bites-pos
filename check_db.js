const { initDatabase } = require('./database/db');
const DbHelper = require('./database/dbHelper');

async function run() {
    try {
        console.log('Initializing DB...');
        await initDatabase();
        const db = new DbHelper();

        console.log('Checking Products...');
        const products = db.prepare('SELECT * FROM products').all();
        console.log(`Total Products: ${products.length}`);
        console.log(`Active Products: ${products.filter(p => p.is_active).length}`);

        if (products.length > 0) {
            console.log('Sample Product:', products[0]);
        } else {
            console.log('No products found.');
        }

        console.log('\nChecking Deals...');
        const deals = db.prepare('SELECT * FROM deals').all();
        console.log(`Total Deals: ${deals.length}`);

        console.log('\nChecking Expenses...');
        const expenses = db.prepare('SELECT * FROM expenses').all();
        console.log(`Total Expenses: ${expenses.length}`);

        // Check if we can exit
        process.exit(0);
    } catch (err) {
        console.error('Error reading DB:', err);
        process.exit(1);
    }
}

run();
