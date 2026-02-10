# Crunchy Bites POS - User Guide

## Getting Started

### First Time Setup
1. Launch the application
2. The database will be created automatically
3. Sample products and deals are pre-loaded
4. You're ready to start taking orders!

## Main Screen Overview

### Navigation Bar
- **New Order** 🛒 - Create and process customer orders
- **Products** 🍔 - Manage your menu items
- **Deals** 🎁 - Create combo deals
- **Reports** 📊 - View sales reports
- **Orders** 📋 - View order history

---

## Taking Orders

### Step 1: Add Items to Cart
1. Click on **New Order**
2. Browse products by category or switch to **Deals** tab
3. Click on any item to add it to the cart
4. Use **+** and **-** buttons to adjust quantities

### Step 2: Customer Information
- **Walk-in Customer**: Keep the checkbox checked (default)
- **Delivery Order**: Uncheck the box and enter:
  - Customer name (required)
  - Phone number (optional)
  - Delivery address (optional)

### Step 3: Complete Order
1. Review the cart and total amount
2. Click **"Place Order & Print"**
3. Receipt will print automatically
4. If no printer is connected, a PDF will be saved to Downloads

### Tips:
- Use **Clear** button to empty the cart
- Remove individual items with the **Remove** button
- Total updates automatically as you add/remove items

---

## Managing Products

### Adding a New Product
1. Go to **Products** tab
2. Click **"+ Add Product"**
3. Fill in:
   - Product name (e.g., "Spicy Burger")
   - Category (Burger, Fries, Wings, Drinks, Other)
   - Price in Rs.
4. Click **Save**

### Editing a Product
1. Find the product in the list
2. Click **Edit** button
3. Make changes
4. Click **Save**

### Deleting a Product
1. Find the product in the list
2. Click **Delete** button
3. Confirm deletion
4. Product will be removed (soft delete - data preserved)

---

## Creating Combo Deals

### Adding a New Deal
1. Go to **Deals** tab
2. Click **"+ Add Deal"**
3. Enter deal information:
   - Deal name (e.g., "Family Pack")
   - Description (e.g., "Perfect for 4 people")
   - Deal price
4. Add items included in the deal:
   - Click **"+ Add Item"**
   - Select product from dropdown
   - Enter quantity
   - Repeat for all items
5. Click **Save**

### Example Deal:
**Value Meal - Rs. 499**
- 1x Classic Burger
- 1x Regular Fries
- 1x Coke

### Editing/Deleting Deals
- Works the same as products
- Click **Edit** or **Delete** on any deal card

---

## Viewing Reports

### End of Day Report
1. Go to **Reports** tab
2. Select a date (defaults to today)
3. Click **"Generate Report"**
4. View:
   - Total orders
   - Total sales amount
   - Product sales breakdown
   - Deal sales breakdown
5. Click **"Print Report"** to print or save as PDF

### What Reports Show:
- **Summary**: Total orders and revenue
- **Product Breakdown**: Which items sold and how much revenue
- **Deal Breakdown**: Which deals sold and how much revenue
- **Hourly Breakdown**: Sales by hour (if applicable)

---

## Order History

### Viewing Past Orders
1. Go to **Orders** tab
2. By default, shows today's orders
3. Use date filter to view specific date
4. Click **"Show All"** to see recent 100 orders

### Reprinting Receipts
1. Find the order in the list
2. Click **"Reprint"** button
3. Receipt will print or save as PDF

---

## Printing

### Receipt Printing
- **Automatic**: If printer is connected, receipt prints silently
- **PDF Fallback**: If no printer, PDF saves to Downloads folder
- **Receipt includes**:
  - Order number and date
  - Customer details (if provided)
  - All items with quantities and prices
  - Total amount
  - Shop logo and thank you message

### Report Printing
- Shows print dialog (you can choose printer)
- Falls back to PDF if cancelled or failed
- Includes detailed sales breakdown

---

## Tips & Best Practices

### Daily Workflow
1. **Morning**: Generate yesterday's report for records
2. **During Day**: Take orders as they come
3. **End of Day**: Generate today's report

### Inventory Management
- Regularly update product prices
- Remove discontinued items
- Create seasonal deals

### Customer Service
- Keep customer details for delivery orders
- Use walk-in for quick counter sales
- Reprint receipts if customers need them

### Data Safety
- Database is saved automatically
- Located in: `%APPDATA%/crunchy-bites-pos/`
- Consider backing up this folder weekly

---

## Troubleshooting

### Can't add items to cart?
- Make sure products/deals are active
- Try refreshing the view

### Printing not working?
- Check printer is on and connected
- Set as default printer in Windows
- PDF will generate automatically if printer fails

### Wrong total amount?
- Check product prices are correct
- Verify quantities in cart

### Application won't start?
- Check if Node.js is installed
- Try running `npm install` again
- See INSTALL.md for detailed setup

---

## Keyboard Shortcuts

- **Ctrl + N**: New Order (when implemented)
- **Ctrl + P**: Products
- **Ctrl + D**: Deals
- **Ctrl + R**: Reports

---

## Support

For technical issues:
1. Check README.md
2. Check INSTALL.md for setup problems
3. Review this user guide

**Remember**: All data is stored locally - no internet required!

---

**Crunchy Bites POS System**
*Simple. Fast. Reliable.*
