# Crunchy Bites POS System

A complete offline-first Point of Sale (POS) desktop application for fast-food outlets, built with Electron, Node.js, and SQLite.

## Features

### ✅ Core Functionality
- **Product Management** - Add, edit, and delete products with categories
- **Deal Management** - Create combo deals with multiple products
- **Order Processing** - Fast order creation with cart management
- **Customer Support** - Optional customer details or walk-in orders
- **Receipt Printing** - Automatic silent print or PDF generation
- **Sales Reports** - End-of-day reports with detailed breakdowns
- **Order History** - View and reprint past orders
- **100% Offline** - No internet required, all data stored locally

### 🎯 Key Highlights
- **Auto Database Setup** - SQLite database created automatically on first run
- **Sample Data** - Pre-loaded with sample products and deals
- **Smart Printing** - Auto-detects printer, falls back to PDF if unavailable
- **Soft Delete** - Products and deals are deactivated, not permanently deleted
- **Transaction Safety** - Database transactions ensure data integrity
- **Modern UI** - Clean, responsive interface optimized for POS use

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)

### Setup Steps

1. **Navigate to project directory**
   ```bash
   cd "c:\Programming\Crunchy Bites"
   ```

2. **Install dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

## Usage Guide

### First Launch
On first launch, the application will:
- Create a SQLite database in your user data folder
- Set up all required tables
- Insert sample products and deals

### Navigation
- **New Order** - Create and process customer orders
- **Products** - Manage your product catalog
- **Deals** - Create and manage combo deals
- **Reports** - Generate sales reports
- **Orders** - View order history

### Creating an Order
1. Click on products or deals to add to cart
2. Adjust quantities using +/- buttons
3. Optionally add customer details (or use walk-in)
4. Click "Place Order & Print"
5. Receipt will print automatically or save as PDF

### Managing Products
1. Go to Products tab
2. Click "+ Add Product"
3. Fill in name, category, and price
4. Save to add to catalog

### Creating Deals
1. Go to Deals tab
2. Click "+ Add Deal"
3. Enter deal name, description, and price
4. Add products that are included in the deal
5. Save to create combo deal

### Generating Reports
1. Go to Reports tab
2. Select a date
3. Click "Generate Report"
4. View sales summary and breakdowns
5. Click "Print Report" to print or save as PDF

## Project Structure

```
crunchy-bites-pos/
├── electron.js              # Main Electron process
├── preload.js               # IPC bridge
├── package.json             # Dependencies and scripts
├── database/
│   └── db.js                # Database initialization
├── backend/
│   ├── services/            # Business logic
│   │   ├── productService.js
│   │   ├── dealService.js
│   │   ├── orderService.js
│   │   ├── reportService.js
│   │   └── printService.js
│   └── ipc/
│       └── handlers.js      # IPC request handlers
├── frontend/
│   ├── index.html           # Main UI
│   ├── renderer.js          # Frontend logic
│   └── styles/
│       ├── main.css
│       └── pos.css
├── assets/
│   └── logo.png             # Shop logo
└── README.md
```

## Database Schema

### Tables
- **products** - Product catalog with prices and categories
- **deals** - Combo deal definitions
- **deal_items** - Products included in each deal
- **customers** - Customer information
- **orders** - Order records
- **order_items** - Line items for each order

### Data Location
Database file: `%APPDATA%/crunchy-bites-pos/crunchy-bites.db`

## Printing

### Receipt Printing
- **With Printer**: Automatically prints silently to default printer
- **Without Printer**: Generates PDF and saves to Downloads folder

### Report Printing
- Shows print dialog for user to select printer
- Falls back to PDF if printing is cancelled or fails

## Development

### Running in Development Mode
```bash
npm run dev
```
This opens DevTools for debugging.

### Building for Production
The application runs directly with Electron. For distribution, you can use electron-builder:

```bash
npm install --save-dev electron-builder
```

Add to package.json:
```json
"scripts": {
  "build": "electron-builder"
}
```

## Troubleshooting

### Database Issues
- Database is created automatically in user data folder
- If issues occur, delete the database file and restart the app
- Location: `%APPDATA%/crunchy-bites-pos/`

### Printing Issues
- Ensure printer is connected and set as default
- If printing fails, PDF will be generated automatically
- PDFs are saved to Downloads folder

### Performance
- Database is optimized with indexes
- Soft deletes keep data integrity
- Transactions ensure atomic operations

## Technical Details

### Technologies Used
- **Electron** - Desktop application framework
- **Node.js** - Backend runtime
- **SQLite** (better-sqlite3) - Local database
- **HTML/CSS/JavaScript** - Frontend
- **Electron IPC** - Frontend-backend communication

### Security
- Context isolation enabled
- No remote content loading
- All data stored locally
- No external API calls

## Support

For issues or questions:
1. Check this README
2. Review code comments
3. Check database schema in `database/db.js`

## License

MIT License - Free to use and modify for your business needs.

---

**Built for Crunchy Bites** 🍔🍟
*Fast, Simple, Offline POS System*
