const { ipcMain } = require('electron');
const ProductService = require('../services/productService');
const DealService = require('../services/dealService');
const OrderService = require('../services/orderService');
const ReportService = require('../services/reportService');

/**
 * IPC Handlers
 * Connects frontend requests to backend services
 */

function setupIpcHandlers() {
    const productService = new ProductService();
    const dealService = new DealService();
    const orderService = new OrderService();
    const reportService = new ReportService();

    // ============ PRODUCT HANDLERS ============

    ipcMain.handle('products:getAll', async () => {
        try {
            return { success: true, data: productService.getAllProducts() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('products:getById', async (event, id) => {
        try {
            return { success: true, data: productService.getProductById(id) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('products:getByCategory', async (event, category) => {
        try {
            return { success: true, data: productService.getProductsByCategory(category) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('products:create', async (event, data) => {
        try {
            return { success: true, data: productService.createProduct(data) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('products:update', async (event, id, data) => {
        try {
            return { success: true, data: productService.updateProduct(id, data) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('products:delete', async (event, id) => {
        try {
            productService.deleteProduct(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('products:getCategories', async () => {
        try {
            return { success: true, data: productService.getCategories() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ============ DEAL HANDLERS ============

    ipcMain.handle('deals:getAll', async () => {
        try {
            return { success: true, data: dealService.getAllDeals() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('deals:getById', async (event, id) => {
        try {
            return { success: true, data: dealService.getDealById(id) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('deals:create', async (event, dealData, items) => {
        try {
            return { success: true, data: dealService.createDeal(dealData, items) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('deals:update', async (event, id, dealData, items) => {
        try {
            return { success: true, data: dealService.updateDeal(id, dealData, items) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('deals:delete', async (event, id) => {
        try {
            dealService.deleteDeal(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ============ ORDER HANDLERS ============

    ipcMain.handle('orders:create', async (event, customerData, items) => {
        try {
            return { success: true, data: orderService.createOrder(customerData, items) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('orders:getById', async (event, id) => {
        try {
            return { success: true, data: orderService.getOrderById(id) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('orders:getToday', async () => {
        try {
            return { success: true, data: orderService.getTodayOrders() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('orders:getAll', async (event, limit) => {
        try {
            return { success: true, data: orderService.getAllOrders(limit) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('orders:getByDate', async (event, date) => {
        try {
            return { success: true, data: orderService.getOrdersByDate(date) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ============ REPORT HANDLERS ============

    ipcMain.handle('reports:endOfDay', async (event, date) => {
        try {
            return { success: true, data: reportService.getEndOfDayReport(date) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('reports:dateRange', async (event, startDate, endDate) => {
        try {
            return { success: true, data: reportService.getDateRangeReport(startDate, endDate) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('reports:topProducts', async (event, limit) => {
        try {
            return { success: true, data: reportService.getTopProducts(limit) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('reports:topDeals', async (event, limit) => {
        try {
            return { success: true, data: reportService.getTopDeals(limit) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ============ PRINT HANDLERS ============

    const PrintService = require('../services/printService');

    ipcMain.handle('print:receipt', async (event, orderIdOrData) => {
        try {
            const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];

            let orderData;

            // Check if we received an ID (number) or the full order object
            if (typeof orderIdOrData === 'number') {
                // Fetch the full order data
                orderData = orderService.getOrderById(orderIdOrData);
                if (!orderData) {
                    return { success: false, error: 'Order not found' };
                }
            } else if (typeof orderIdOrData === 'object' && orderIdOrData.id) {
                // We already have the full order object
                orderData = orderIdOrData;
            } else {
                return { success: false, error: 'Invalid order data' };
            }

            const result = await PrintService.printReceipt(orderData, mainWindow);
            return result;
        } catch (error) {
            console.error('Print receipt error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('print:report', async (event, reportData) => {
        try {
            const result = await PrintService.printReport(reportData);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // ============ BACKUP HANDLERS ============

    const BackupService = require('../services/backupService');
    const { dialog } = require('electron');
    const backupService = new BackupService();

    ipcMain.handle('backup:create', async () => {
        try {
            const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];

            // Show save dialog
            const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
                title: 'Save Backup',
                defaultPath: `crunchy-bites-backup-${new Date().toISOString().split('T')[0]}.zip`,
                filters: [
                    { name: 'Backup Files', extensions: ['zip'] }
                ]
            });

            if (canceled || !filePath) {
                return { success: false, canceled: true };
            }

            return await backupService.createManualBackup(filePath);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('backup:restore', async () => {
        try {
            const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];

            // Show open dialog
            const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
                title: 'Select Backup File',
                filters: [
                    { name: 'Backup Files', extensions: ['zip'] }
                ],
                properties: ['openFile']
            });

            if (canceled || filePaths.length === 0) {
                return { success: false, canceled: true };
            }

            return await backupService.restoreBackup(filePaths[0]);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('backup:getInfo', async () => {
        try {
            return backupService.getDatabaseInfo();
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('backup:setAutoBackup', async (event, enabled) => {
        try {
            return backupService.setAutoBackupEnabled(enabled);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('backup:runAutoBackup', async () => {
        try {
            return await backupService.createAutoBackup();
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    console.log('IPC handlers registered successfully');
}

module.exports = { setupIpcHandlers };
