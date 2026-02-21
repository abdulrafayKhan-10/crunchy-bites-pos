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

// Immediate log to verify renderer loading
if (window.api && window.api.logger) {
    window.api.logger.log('INFO', 'Renderer script execution started');
} else {
    console.error('window.api is not defined in renderer!');
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

function initializeApp() {
    // Set current date
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
    const now = new Date();
    const today = now.toLocaleDateString('en-CA');
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');

    const reportStart = document.getElementById('reportStartDate');
    const reportEnd = document.getElementById('reportEndDate');

    // Set default dates (Start of Month -> Today)
    reportStart.value = startOfMonth;
    reportEnd.value = today;

    reportStart.addEventListener('change', generateReport);
    reportEnd.addEventListener('change', generateReport);

    // Order filters - Auto-filter on date change/click
    const orderStart = document.getElementById('orderStartDate');
    const orderEnd = document.getElementById('orderEndDate');

    orderStart.value = startOfMonth;
    orderEnd.value = today;

    // Auto-filter listeners
    orderStart.addEventListener('change', filterOrders);
    orderEnd.addEventListener('change', filterOrders);

    const filterOrderBtn = document.getElementById('filterOrdersBtn');
    if (filterOrderBtn) filterOrderBtn.style.display = 'none';

    document.getElementById('showAllOrdersBtn').addEventListener('click', loadAllOrders);

    // Expense management
    const expenseStart = document.getElementById('expenseStartDate');
    const expenseEnd = document.getElementById('expenseEndDate');

    expenseStart.value = startOfMonth;
    expenseEnd.value = today;

    // Auto-filter listeners
    expenseStart.addEventListener('change', loadExpenses);
    expenseEnd.addEventListener('change', loadExpenses);

    document.getElementById('addExpenseBtn').addEventListener('click', () => {
        document.getElementById('expenseModal').classList.add('active');
        // Set today's date in form if empty
        const expenseDateInput = document.getElementById('expenseEntryDate');
        if (expenseDateInput && !expenseDateInput.value) {
            expenseDateInput.value = today;
        }
    });

    document.getElementById('expenseForm').addEventListener('submit', saveExpense);

    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) closeModals();
        };
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
    const today = new Date().toLocaleDateString('en-CA');

    if (viewName === 'products') loadProducts();
    if (viewName === 'deals') loadDeals();
    if (viewName === 'orders') {
        if (viewName === 'orders') {
            filterOrders();
        }
    }
    if (viewName === 'expenses') {
        loadExpenses();
    }
    if (viewName === 'reports') {
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
    try {
        const result = await window.api.products.getAll();
        if (result.success) {
            products = Array.isArray(result.data) ? result.data : [];

            if (products.length === 0) {
                // console.warn('No products found in database.');
            }

            renderProductsGrid();
            renderCategoryFilter();
        } else {
            console.error('Failed to load products:', result.error);
            showToast('Error loading products: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error in loadProductsForOrder:', error);
        showToast('System error loading products', 'error');
    }
}

async function loadDealsForOrder() {
    try {
        const result = await window.api.deals.getAll();
        if (result.success) {
            deals = Array.isArray(result.data) ? result.data : [];
            renderDealsGrid();
        } else {
            console.error('Failed to load deals:', result.error);
            showToast('Error loading deals: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error in loadDealsForOrder:', error);
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

async function filterOrders() {
    const startDate = document.getElementById('orderStartDate').value;
    const endDate = document.getElementById('orderEndDate').value;

    if (!startDate || !endDate) return;

    // Use filtering API (we added getOrdersByDateRange to backend)
    // We need to expose it in preload first? 
    // Wait, preload has 'orders:getByDate' but not 'orders:getByRange' yet?
    // Let's check preload.js. If not there, we use 'orders:getByDate' loop? No, inefficient.
    // I should have added 'orders:getByRange' to preload. 

    // Actually, let's use the IPC directly if preload is missing, or update preload.
    // I checked preload earlier, I didn't add orders:getByRange. 
    // I MUST UPDATE PRELOAD.JS first or now.

    // For now, let's assume I'll fix preload in next step.
    // Writing code assuming window.api.orders.getByRange(start, end) exists.

    try {
        // We need to add this to preload!
        const result = await window.api.orders.getByRange(startDate, endDate);

        if (result.success) {
            renderOrdersTable(result.data);
        } else {
            showToast('Error filtering orders: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Filter error:', error);
    }
}

async function loadTodayOrders() {
    const today = new Date().toISOString().split('T')[0];
    const result = await window.api.orders.getByDate(today); // Still using getByDate for "today"
    if (result.success) {
        renderOrdersTable(result.data);
    }
}

async function loadAllOrders() {
    // Clear date inputs
    document.getElementById('orderStartDate').value = '';
    document.getElementById('orderEndDate').value = '';

    const result = await window.api.orders.getAll(100);
    if (result.success) {
        renderOrdersTable(result.data);
    } else {
        showToast('Error loading orders: ' + result.error, 'error');
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
    if (!grid) {
        return;
    }

    const filtered = currentCategory === 'all'
        ? products
        : products.filter(p => p.category === currentCategory);

    const html = filtered.map(product => `
    <div class="item-card" onclick="addToCart('product', ${product.id})">
      <div class="item-icon">${getCategoryIcon(product.category)}</div>
      <div class="item-name">${product.name}</div>
      <div class="item-category">${product.category || 'Other'}</div>
      <div class="item-price">Rs. ${product.price.toFixed(2)}</div>
    </div>
  `).join('');

    // console.log('XXX DEBUG: HTML generated:', html);
    grid.innerHTML = html;
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
        <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})">Cancel</button>
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
        const walkInCheckbox = document.getElementById('walkInCheckbox');
        walkInCheckbox.checked = true;
        walkInCheckbox.dispatchEvent(new Event('change'));
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

// ============ ORDER CANCELLATION ============
window.deleteOrder = async function (orderId) {
    if (!confirm(`Are you sure you want to cancel/delete Order #${orderId}? This action cannot be undone.`)) return;

    try {
        const result = await window.api.orders.delete(orderId);
        if (result.success) {
            showToast(`Order #${orderId} has been cancelled.`, 'success');
            // Refresh the orders table using the current filter
            const startDate = document.getElementById('orderStartDate').value;
            const endDate = document.getElementById('orderEndDate').value;
            if (startDate && endDate) {
                filterOrders();
            } else {
                loadAllOrders();
            }
        } else {
            showToast('Error cancelling order: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('Failed to cancel order', 'error');
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

    // Auto-focus on name input
    setTimeout(() => {
        const nameInput = document.getElementById('productName');
        if (nameInput) nameInput.focus();
    }, 50);
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
    document.getElementById('dealItemsList').innerHTML = '';

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

    // Auto-focus on name input
    setTimeout(() => {
        const nameInput = document.getElementById('dealName');
        if (nameInput) {
            nameInput.focus();
            nameInput.select(); // Also select text if any
        }
    }, 100);
}

function addDealItemRow(productId = null, quantity = 1) {
    const container = document.getElementById('dealItemsList');
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
    console.log('saveDeal called');

    const id = document.getElementById('dealId').value;
    const dealData = {
        name: document.getElementById('dealName').value,
        description: document.getElementById('dealDescription').value,
        price: parseFloat(document.getElementById('dealPrice').value)
    };
    console.log('Deal Data:', dealData);

    // Collect items
    const itemRows = document.querySelectorAll('.deal-item-row');
    const items = Array.from(itemRows).map(row => ({
        product_id: parseInt(row.querySelector('.deal-item-product').value),
        quantity: parseInt(row.querySelector('.deal-item-quantity').value)
    }));
    console.log('Deal Items:', items);

    // Validate items
    if (!items || items.length === 0) {
        showToast('Please add at least one product to the deal', 'warning');
        return;
    }

    if (items.some(i => !i.product_id || isNaN(i.product_id) || i.quantity <= 0)) {
        console.warn('Validation failed: Invalid product IDs or quantity', items);
        showToast('Invalid deal items. Please check selections.', 'warning');
        return;
    }

    try {
        let result;
        if (id) {
            console.log('Updating deal:', id);
            result = await window.api.deals.update(parseInt(id), dealData, items);
        } else {
            console.log('Creating new deal');
            result = await window.api.deals.create(dealData, items);
        }
        console.log('API Result:', result);

        if (result.success) {
            showToast('Deal saved successfully', 'success');
            closeModals();
            await loadDeals();
            await loadDealsForOrder();
        } else {
            console.error('Backend error:', result.error);
            showToast('Error saving deal: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('saveDeal unexpected error:', error);
        showToast('System error saving deal', 'error');
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
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) return;

    try {
        const result = await window.api.reports.dateRange(startDate, endDate);

        if (result.success) {
            renderReportSafe(result.data);
            document.getElementById('headerPrintReportBtn').style.display = 'block';
        } else {
            showToast('Error generating report: ' + result.error, 'error');
            document.getElementById('headerPrintReportBtn').style.display = 'none';
        }
    } catch (error) {
        console.error('generateReport exception:', error);
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
        <h3>Total Orders</h3>
        <div class="value">${data.summary.total_orders}</div>
      </div>
      <div class="summary-card">
        <h3>Total Sales</h3>
        <div class="value">Rs. ${data.summary.total_sales.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <h3>Avg Order Value</h3>
        <div class="value">Rs. ${avgOrderValue}</div>
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
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) return;

    const result = await window.api.reports.dateRange(startDate, endDate);

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
    } else {
        showToast('Error generating report: ' + result.error, 'error');
    }
}

// ============ EXPENSE MANAGEMENT ============

async function loadExpenses() {
    try {
        const startDate = document.getElementById('expenseStartDate').value;
        const endDate = document.getElementById('expenseEndDate').value;

        if (!startDate || !endDate) return;

        // Fetch expenses
        const expenseResult = await window.api.expenses.getByRange(startDate, endDate);

        // Fetch sales report for range to calculate Net Cash
        const reportResult = await window.api.reports.dateRange(startDate, endDate);

        let totalSales = 0;
        if (reportResult.success) {
            totalSales = reportResult.data.summary.total_sales || 0;
        }

        if (expenseResult.success) {
            renderExpenses(expenseResult.data, totalSales);
        } else {
            showToast('Error loading expenses: ' + expenseResult.error, 'error');
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        showToast('Error loading expenses', 'error');
    }
}

function renderExpenses(expenses, totalSales) {
    const tbody = document.querySelector('#expensesTable tbody');
    tbody.innerHTML = '';

    let totalExpenses = 0;

    expenses.forEach(expense => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td>${expense.description}</td>
            <td><span class="badge badge-secondary">${expense.category || 'General'}</span></td>
            <td>${expense.quantity} ${expense.unit || ''}</td>
            <td>Rs. ${expense.amount.toFixed(0)}</td>
            <td>
                <button class="btn btn-icon btn-secondary btn-sm" onclick="editExpense(${expense.id})" style="margin-right:4px">✏️</button>
                <button class="btn btn-icon btn-danger btn-sm" onclick="deleteExpense(${expense.id})">❌</button>
            </td>
        `;
        tbody.appendChild(tr);
        totalExpenses += expense.amount;
    });

    // Update Summary Cards
    document.getElementById('totalExpensesAmount').textContent = `Rs. ${totalExpenses.toFixed(0)}`;

    // Net Cash in Hand
    const netCash = totalSales - totalExpenses;
    const netCashEl = document.getElementById('netCashInHand');
    netCashEl.textContent = `Rs. ${netCash.toFixed(0)}`;

    // Color coding for net cash
    if (netCash >= 0) {
        netCashEl.style.color = '#2ecc71'; // Green
    } else {
        netCashEl.style.color = '#e74c3c'; // Red
    }
}

async function saveExpense(e) {
    e.preventDefault();

    const description = document.getElementById('expenseDescription').value;
    const category = document.getElementById('expenseCategory').value;
    const quantity = parseInt(document.getElementById('expenseQuantity').value) || 1;
    const unit = document.getElementById('expenseUnit').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseEntryDate').value;

    if (!description || !amount || !date) {
        showToast('Please fill required fields', 'error');
        return;
    }

    try {
        const result = await window.api.expenses.add({
            description,
            category,
            quantity,
            unit,
            amount,
            date
        });

        if (result.success) {
            showToast('Expense added successfully', 'success');
            closeModals();
            loadExpenses(); // Reload table
        } else {
            showToast('Error adding expense: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error saving expense:', error);
        showToast('Error saving expense', 'error');
    }
}

async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
        const result = await window.api.expenses.delete(id);
        if (result.success) {
            showToast('Expense deleted', 'success');
            loadExpenses();
        } else {
            showToast('Error deleting expense: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showToast('Error deleting expense', 'error');
    }
}

// Expose deleteExpense globally
window.deleteExpense = deleteExpense;

// ============ EXPENSE EDIT ============
// Store the expense being edited
let editingExpenseId = null;

window.editExpense = function (id) {
    // Find the expense data from the currently rendered table row
    const rows = document.querySelectorAll('#expensesTable tbody tr');
    let expenseData = null;

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        // Check if the edit button in this row matches the id
        const editBtn = row.querySelector(`button[onclick="editExpense(${id})"]`);
        if (editBtn) {
            expenseData = {
                date: cells[0].textContent.trim(),
                description: cells[1].textContent.trim(),
                category: cells[2].querySelector('.badge') ? cells[2].querySelector('.badge').textContent.trim() : cells[2].textContent.trim(),
                qty: cells[3].textContent.trim().split(' ')[0],
                unit: cells[3].textContent.trim().split(' ')[1] || '',
                amount: cells[4].textContent.replace('Rs. ', '').trim()
            };
        }
    });

    editingExpenseId = id;

    // Populate modal fields
    const modal = document.getElementById('editExpenseModal');
    // Date: convert to YYYY-MM-DD for the input
    if (expenseData && expenseData.date) {
        const parsedDate = new Date(expenseData.date);
        if (!isNaN(parsedDate)) {
            document.getElementById('editExpenseDate').value = parsedDate.toLocaleDateString('en-CA');
        }
    }
    document.getElementById('editExpenseDescription').value = expenseData ? expenseData.description : '';
    document.getElementById('editExpenseCategory').value = expenseData ? expenseData.category : '';
    document.getElementById('editExpenseQuantity').value = expenseData ? expenseData.qty : 1;
    document.getElementById('editExpenseUnit').value = expenseData ? expenseData.unit : '';
    document.getElementById('editExpenseAmount').value = expenseData ? expenseData.amount : '';

    modal.classList.add('active');
};

async function saveEditedExpense(e) {
    e.preventDefault();

    if (!editingExpenseId) return;

    const data = {
        description: document.getElementById('editExpenseDescription').value,
        category: document.getElementById('editExpenseCategory').value,
        quantity: parseInt(document.getElementById('editExpenseQuantity').value) || 1,
        unit: document.getElementById('editExpenseUnit').value,
        amount: parseFloat(document.getElementById('editExpenseAmount').value),
        date: document.getElementById('editExpenseDate').value
    };

    if (!data.description || !data.amount || !data.date) {
        showToast('Please fill required fields', 'error');
        return;
    }

    try {
        const result = await window.api.expenses.update(editingExpenseId, data);
        if (result.success) {
            showToast('Expense updated successfully', 'success');
            closeModals();
            editingExpenseId = null;
            loadExpenses();
        } else {
            showToast('Error updating expense: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        showToast('Failed to update expense', 'error');
    }
}


function renderReportSafe(data) {
    const container = document.getElementById('reportContent');
    console.log('Use Safe Render', data); // Log data to debug
    if (!container) return;

    const summary = data.summary || { total_orders: 0, total_sales: 0 };
    const products = Array.isArray(data.products) ? data.products : [];
    const deals = Array.isArray(data.deals) ? data.deals : [];

    const avgOrderValue = summary.total_orders > 0
        ? (summary.total_sales / summary.total_orders).toFixed(2)
        : '0.00';

    // Use 'highlight' class for better visibility (White bg, colored text)
    let html = `
    <div class="report-summary">
      <div class="summary-card highlight">
        <h3>Total Orders</h3>
        <div class="value">${summary.total_orders}</div>
      </div>
      <div class="summary-card highlight">
        <h3>Total Sales</h3>
        <div class="value">Rs. ${summary.total_sales.toFixed(2)}</div>
      </div>
      <div class="summary-card highlight">
        <h3>Avg Order Value</h3>
        <div class="value">Rs. ${avgOrderValue}</div>
      </div>
    </div>`;

    if (products.length > 0) {
        html += `
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
              ${products.map(p => `
                <tr>
                  <td>${p.product_name}</td>
                  <td>${p.category}</td>
                  <td>${p.quantity_sold}</td>
                  <td>Rs. ${p.total_sales.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    if (deals.length > 0) {
        html += `
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
              ${deals.map(d => `
                <tr>
                  <td>${d.deal_name}</td>
                  <td>${d.quantity_sold}</td>
                  <td>Rs. ${d.total_sales.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    if (data.orders && data.orders.length > 0) {
        html += `
        <div class="report-section">
          <h3>Order Transactions</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.orders.map(o => `
                <tr>
                  <td>#${o.id}</td>
                  <td>${new Date(o.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${o.customer_name}</td>
                  <td>Rs. ${o.total_amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    if (products.length === 0 && deals.length === 0 && (!data.orders || data.orders.length === 0)) {
        html += `
        <div class="report-section">
            <p class="text-muted" style="text-align:center; padding: 2rem;">No details available for this period.</p>
        </div>`;
    }

    container.innerHTML = html;
}

// ============ UTILITIES ============
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
        // Reset forms
        const form = modal.querySelector('form');
        if (form) form.reset();
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
        drink: '🥤',
        wings: '🍗',
        broast: '🍗',
        other: '🧂'
    };
    return icons[category?.toLowerCase()] || icons.other;
}

// ============ SHOW ALL FUNCTIONS ============
// ============ SHOW ALL FUNCTIONS ============
// Functions removed as per request to disable "Show All" functionality

