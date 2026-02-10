/**
 * Crunchy Bites POS - Frontend Renderer
 * Handles all UI interactions and API calls
 */

// ============ STATE MANAGEMENT ============
let cart = [];
let products = [];
let deals = [];
let currentView = 'new-order';
let currentTab = 'products';
let currentCategory = 'all';

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

function initializeApp() {
    // Update date display
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
}

function updateDateTime() {
    const dateElement = document.getElementById('currentDate');
    const now = new Date();
    dateElement.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Walk-in checkbox toggle
    document.getElementById('walkInCheckbox').addEventListener('change', (e) => {
        document.getElementById('customerForm').classList.toggle('hidden', e.target.checked);
    });

    // Cart actions
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);

    // Product management
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    document.getElementById('productForm').addEventListener('submit', saveProduct);

    // Deal management
    document.getElementById('addDealBtn').addEventListener('click', () => openDealModal());
    document.getElementById('dealForm').addEventListener('submit', saveDeal);
    document.getElementById('addDealItemBtn').addEventListener('click', addDealItemRow);

    // Reports - Auto-generate on date change
    document.getElementById('reportDate').addEventListener('change', generateReport);

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reportDate').value = today;
    document.getElementById('orderFilterDate').value = today;

    // Order filters - Auto-filter on date change
    document.getElementById('orderFilterDate').addEventListener('change', filterOrders);
    document.getElementById('showAllOrdersBtn').addEventListener('click', loadAllOrders);

    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModals();
        });
    });
}

// ============ VIEW MANAGEMENT ============
function switchView(viewName) {
    currentView = viewName;

    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');

    // Load data for specific views
    if (viewName === 'products') loadProducts();
    if (viewName === 'deals') loadDeals();
    if (viewName === 'orders') {
        const todayLocal = new Date().toLocaleDateString('en-CA');
        document.getElementById('orderFilterDate').value = todayLocal;
        loadTodayOrders();
    }
    if (viewName === 'reports') {
        // Auto-load today's report
        const todayLocal = new Date().toLocaleDateString('en-CA');
        document.getElementById('reportDate').value = todayLocal;
        generateReport();
    }
    if (viewName === 'settings') {
        loadDatabaseInfo();
    }
}

function switchTab(tabName) {
    currentTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.getElementById('productsGrid').classList.toggle('hidden', tabName !== 'products');
    document.getElementById('dealsGrid').classList.toggle('hidden', tabName !== 'deals');
}

// ============ DATA LOADING ============
async function loadInitialData() {
    await Promise.all([
        loadProductsForOrder(),
        loadDealsForOrder()
    ]);
}

async function loadProductsForOrder() {
    const result = await window.api.products.getAll();
    if (result.success) {
        products = result.data;
        renderProductsGrid();
        renderCategoryFilter();
    }
}

async function loadDealsForOrder() {
    const result = await window.api.deals.getAll();
    if (result.success) {
        deals = result.data;
        renderDealsGrid();
    }
}

async function loadProducts() {
    const result = await window.api.products.getAll();
    if (result.success) {
        products = result.data;
        renderProductsTable();
    }
}

async function loadDeals() {
    const result = await window.api.deals.getAll();
    if (result.success) {
        deals = result.data;
        renderDealsManagement();
    }
}

async function loadTodayOrders() {
    const result = await window.api.orders.getToday();
    if (result.success) {
        renderOrdersTable(result.data);
    }
}

async function loadAllOrders() {
    const result = await window.api.orders.getAll(100);
    if (result.success) {
        renderOrdersTable(result.data);
    }
}

async function filterOrders() {
    const date = document.getElementById('orderFilterDate').value;
    if (!date) {
        showToast('Please select a date', 'warning');
        return;
    }

    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    const result = await window.api.orders.getByDate(date);
    if (result.success) {
        renderOrdersTable(result.data);
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading orders</td></tr>';
        showToast('Error: ' + result.error, 'error');
    }
}

// ============ RENDERING ============
function renderCategoryFilter() {
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
    const filterContainer = document.getElementById('categoryFilter');

    filterContainer.innerHTML = `
    <button class="filter-btn active" data-category="all">All</button>
    ${categories.map(cat => `
      <button class="filter-btn" data-category="${cat}">${capitalize(cat)}</button>
    `).join('')}
  `;

    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;
            filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProductsGrid();
        });
    });
}

function renderProductsGrid() {
    const grid = document.getElementById('productsGrid');
    const filtered = currentCategory === 'all'
        ? products
        : products.filter(p => p.category === currentCategory);

    grid.innerHTML = filtered.map(product => `
    <div class="item-card" onclick="addToCart('product', ${product.id})">
      <div class="item-icon">${getCategoryIcon(product.category)}</div>
      <div class="item-name">${product.name}</div>
      <div class="item-category">${product.category || 'Other'}</div>
      <div class="item-price">Rs. ${product.price.toFixed(2)}</div>
    </div>
  `).join('');
}

function renderDealsGrid() {
    const grid = document.getElementById('dealsGrid');
    grid.innerHTML = deals.map(deal => `
    <div class="item-card" onclick="addToCart('deal', ${deal.id})">
      <div class="item-icon">🍽️</div>
      <div class="item-name">${deal.name}</div>
      <div class="item-category">${deal.description || ''}</div>
      <div class="item-price">Rs. ${deal.price.toFixed(2)}</div>
    </div>
  `).join('');
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    const totalElement = document.getElementById('totalAmount');

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-cart">No items added yet</p>';
        totalElement.textContent = 'Rs. 0.00';
        return;
    }

    cartContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">Rs. ${item.price.toFixed(2)} each</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
        <span class="qty-display">${item.quantity}</span>
        <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
        <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
      </div>
    </div>
  `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalElement.textContent = `Rs. ${total.toFixed(2)}`;
}

function renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');

    tbody.innerHTML = products.map(product => `
    <tr>
      <td>${product.name}</td>
      <td>${capitalize(product.category || 'Other')}</td>
      <td>Rs. ${product.price.toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editProduct(${product.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderDealsManagement() {
    const container = document.getElementById('dealsContainer');

    container.innerHTML = deals.map(deal => `
    <div class="deal-card">
      <h3>${deal.name}</h3>
      <p class="deal-description">${deal.description || ''}</p>
      <div class="deal-price">Rs. ${deal.price.toFixed(2)}</div>
      <div class="deal-items-list">
        <h4>Includes:</h4>
        <ul>
          ${deal.items.map(item => `
            <li>${item.quantity}x ${item.product_name}</li>
          `).join('')}
        </ul>
      </div>
      <div class="deal-card-actions">
        <button class="btn btn-sm btn-secondary" onclick="editDeal(${deal.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteDeal(${deal.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderOrdersTable(orders) {
    const tbody = document.querySelector('#ordersTable tbody');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
    <tr>
      <td>#${order.id}</td>
      <td>${new Date(order.order_date).toLocaleString()}</td>
      <td>${order.customer_name || 'Walk-in'}</td>
      <td>Rs. ${order.total_amount.toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="reprintReceipt(${order.id})">Reprint</button>
      </td>
    </tr>
  `).join('');
}

// ============ CART MANAGEMENT ============
function addToCart(type, id) {
    let item;

    if (type === 'product') {
        const product = products.find(p => p.id === id);
        if (!product) return;

        item = {
            type: 'product',
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        };
    } else {
        const deal = deals.find(d => d.id === id);
        if (!deal) return;

        item = {
            type: 'deal',
            id: deal.id,
            name: deal.name,
            price: deal.price,
            quantity: 1
        };
    }

    // Check if item already in cart
    const existingIndex = cart.findIndex(i => i.type === type && i.id === id);
    if (existingIndex >= 0) {
        cart[existingIndex].quantity++;
    } else {
        cart.push(item);
    }

    renderCart();
    showToast(`${item.name} added to cart`, 'success');
}

function updateQuantity(index, change) {
    cart[index].quantity += change;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function clearCart() {
    if (cart.length === 0) return;

    if (confirm('Clear all items from cart?')) {
        cart = [];
        renderCart();
        showToast('Cart cleared', 'success');
    }
}

// ============ ORDER PLACEMENT ============
async function placeOrder() {
    if (cart.length === 0) {
        showToast('Cart is empty', 'warning');
        return;
    }

    const isWalkIn = document.getElementById('walkInCheckbox').checked;
    let customerData = null;

    if (!isWalkIn) {
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const address = document.getElementById('customerAddress').value.trim();

        if (!name) {
            showToast('Please enter customer name', 'warning');
            return;
        }

        customerData = { name, phone, address };
    }

    // Prepare order items
    const items = cart.map(item => ({
        type: item.type,
        id: item.id,
        quantity: item.quantity,
        price: item.price
    }));

    // Create order
    const result = await window.api.orders.create(customerData, items);

    if (result.success) {
        showToast('Order placed successfully!', 'success');

        // Print receipt
        const printResult = await window.api.print.receipt(result.data);

        if (printResult.success) {
            if (printResult.method === 'pdf') {
                showToast(`Receipt saved! Opening downloads folder...`, 'success');
            } else {
                showToast('Receipt printed successfully', 'success');
            }
        }

        // Clear cart and form
        cart = [];
        renderCart();
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('customerAddress').value = '';
        document.getElementById('walkInCheckbox').checked = true;
    } else {
        showToast('Error placing order: ' + result.error, 'error');
    }
}

async function printOrderReceipt(orderId) {
    try {
        const result = await window.api.print.receipt(orderId);

        if (result.success) {
            if (result.method === 'print') {
                showToast(`Receipt sent to printer: ${result.printer || 'Default'}`, 'success');
            } else {
                showToast('No printer found. Receipt PDF saved to Downloads.', 'success');
            }
        } else {
            showToast('Failed to generate receipt: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Print receipt error:', error);
        showToast('Failed to generate receipt', 'error');
    }
}

// Expose globally for reprint to access
window.printOrderReceipt = printOrderReceipt;

// Alias for reprint button in order history
window.reprintReceipt = async function (orderId) {
    try {
        await window.printOrderReceipt(orderId);
    } catch (error) {
        console.error('Error in reprintReceipt:', error);
        showToast('Failed to reprint: ' + error.message, 'error');
    }
};

// ============ PRODUCT MANAGEMENT ============
function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');

    form.reset();

    // Populate category datalist uniquely
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
    const datalist = document.getElementById('categoryList');
    datalist.innerHTML = categories.map(cat => `<option value="${cat}">`).join('');

    if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
            title.textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category || 'other';
            document.getElementById('productPrice').value = product.price;
        }
    } else {
        title.textContent = 'Add Product';
    }

    modal.classList.add('active');
}

async function saveProduct(e) {
    e.preventDefault();

    const id = document.getElementById('productId').value;
    const data = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value)
    };

    let result;
    if (id) {
        result = await window.api.products.update(parseInt(id), data);
    } else {
        result = await window.api.products.create(data);
    }

    if (result.success) {
        showToast('Product saved successfully', 'success');
        closeModals();
        await loadProducts();
        await loadProductsForOrder();
    } else {
        showToast('Error saving product: ' + result.error, 'error');
    }
}

function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const result = await window.api.products.delete(id);

    if (result.success) {
        showToast('Product deleted successfully', 'success');
        await loadProducts();
        await loadProductsForOrder();
    } else {
        showToast('Error deleting product: ' + result.error, 'error');
    }
}

// ============ DEAL MANAGEMENT ============
function openDealModal(dealId = null) {
    const modal = document.getElementById('dealModal');
    const form = document.getElementById('dealForm');
    const title = document.getElementById('dealModalTitle');

    form.reset();
    document.getElementById('dealItemsContainer').innerHTML = '';

    if (dealId) {
        const deal = deals.find(d => d.id === dealId);
        if (deal) {
            title.textContent = 'Edit Deal';
            document.getElementById('dealId').value = deal.id;
            document.getElementById('dealName').value = deal.name;
            document.getElementById('dealDescription').value = deal.description || '';
            document.getElementById('dealPrice').value = deal.price;

            // Add existing items
            deal.items.forEach(item => {
                addDealItemRow(item.product_id, item.quantity);
            });
        }
    } else {
        title.textContent = 'Add Deal';
        addDealItemRow(); // Add one empty row
    }

    modal.classList.add('active');
}

function addDealItemRow(productId = null, quantity = 1) {
    const container = document.getElementById('dealItemsContainer');
    const row = document.createElement('div');
    row.className = 'deal-item-row';

    row.innerHTML = `
    <select class="deal-item-product" required>
      <option value="">Select Product</option>
      ${products.map(p => `
        <option value="${p.id}" ${p.id === productId ? 'selected' : ''}>
          ${p.name} (Rs. ${p.price})
        </option>
      `).join('')}
    </select>
    <input type="number" class="deal-item-quantity" min="1" value="${quantity}" placeholder="Qty" required>
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">Remove</button>
  `;

    container.appendChild(row);
}

async function saveDeal(e) {
    e.preventDefault();

    const id = document.getElementById('dealId').value;
    const dealData = {
        name: document.getElementById('dealName').value,
        description: document.getElementById('dealDescription').value,
        price: parseFloat(document.getElementById('dealPrice').value)
    };

    // Collect items
    const itemRows = document.querySelectorAll('.deal-item-row');
    const items = Array.from(itemRows).map(row => ({
        product_id: parseInt(row.querySelector('.deal-item-product').value),
        quantity: parseInt(row.querySelector('.deal-item-quantity').value)
    }));

    if (items.length === 0 || items.some(i => !i.product_id)) {
        showToast('Please add at least one product to the deal', 'warning');
        return;
    }

    let result;
    if (id) {
        result = await window.api.deals.update(parseInt(id), dealData, items);
    } else {
        result = await window.api.deals.create(dealData, items);
    }

    if (result.success) {
        showToast('Deal saved successfully', 'success');
        closeModals();
        await loadDeals();
        await loadDealsForOrder();
    } else {
        showToast('Error saving deal: ' + result.error, 'error');
    }
}

function editDeal(id) {
    openDealModal(id);
}

async function deleteDeal(id) {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    const result = await window.api.deals.delete(id);

    if (result.success) {
        showToast('Deal deleted successfully', 'success');
        await loadDeals();
        await loadDealsForOrder();
    } else {
        showToast('Error deleting deal: ' + result.error, 'error');
    }
}

// ============ REPORTS ============
async function generateReport() {
    const date = document.getElementById('reportDate').value;

    if (!date) {
        showToast('Please select a date', 'warning');
        return;
    }

    const result = await window.api.reports.endOfDay(date);

    if (result.success) {
        renderReport(result.data);
        // Show print button in header
        document.getElementById('headerPrintReportBtn').style.display = 'block';
    } else {
        showToast('Error generating report: ' + result.error, 'error');
        document.getElementById('headerPrintReportBtn').style.display = 'none';
    }
}

function renderReport(data) {
    const container = document.getElementById('reportContent');

    const avgOrderValue = data.summary.total_orders > 0
        ? (data.summary.total_sales / data.summary.total_orders).toFixed(2)
        : '0.00';

    container.innerHTML = `
    <div class="report-summary">
      <div class="summary-card">
        <h3 style="color: #ffffffff;">Total Orders</h3>
        <div class="value" style="color: #ffffffff;">${data.summary.total_orders}</div>
      </div>
      <div class="summary-card">
        <h3 style="color: #ffffffff;">Total Sales</h3>
        <div class="value" style="color: #ffffffff;">Rs. ${data.summary.total_sales.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <h3 style="color: #ffffffff;">Avg Order Value</h3>
        <div class="value" style="color: #ffffffff;">Rs. ${avgOrderValue}</div>
      </div>
    </div>

    ${data.products.length > 0 ? `
      <div class="report-section">
        <h3>Product Sales Breakdown</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Quantity Sold</th>
              <th>Total Sales</th>
            </tr>
          </thead>
          <tbody>
            ${data.products.map(p => `
              <tr>
                <td>${p.product_name}</td>
                <td>${capitalize(p.category)}</td>
                <td>${p.quantity_sold}</td>
                <td>Rs. ${p.total_sales.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    ${data.deals.length > 0 ? `
      <div class="report-section">
        <h3>Deal Sales Breakdown</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Quantity Sold</th>
              <th>Total Sales</th>
            </tr>
          </thead>
          <tbody>
            ${data.deals.map(d => `
              <tr>
                <td>${d.deal_name}</td>
                <td>${d.quantity_sold}</td>
                <td>Rs. ${d.total_sales.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}


  `;
}

async function printReport() {
    const date = document.getElementById('reportDate').value;
    const result = await window.api.reports.endOfDay(date);

    if (result.success) {
        const printResult = await window.api.print.report(result.data);

        if (printResult.success) {
            if (printResult.method === 'pdf') {
                showToast(`Report saved! Opening downloads folder...`, 'success');
            } else {
                showToast('Report printed successfully', 'success');
            }
        } else {
            showToast('Error printing report: ' + printResult.error, 'error');
        }
    }
}

// ============ UTILITIES ============
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCategoryIcon(category) {
    const icons = {
        burger: '🍔',
        burgers: '🍔',
        fries: '🍟',
        drinks: '🥤',
        wings: '🍗',
        broast: '🍗',
        other: '🍔'
    };
    return icons[category?.toLowerCase()] || icons.other;
}
