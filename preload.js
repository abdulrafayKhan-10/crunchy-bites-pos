const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload Script
 * Exposes safe IPC methods to the frontend via contextBridge
 */

contextBridge.exposeInMainWorld('api', {
    // Product API
    products: {
        getAll: () => ipcRenderer.invoke('products:getAll'),
        getById: (id) => ipcRenderer.invoke('products:getById', id),
        getByCategory: (category) => ipcRenderer.invoke('products:getByCategory', category),
        create: (data) => ipcRenderer.invoke('products:create', data),
        update: (id, data) => ipcRenderer.invoke('products:update', id, data),
        delete: (id) => ipcRenderer.invoke('products:delete', id),
        getCategories: () => ipcRenderer.invoke('products:getCategories')
    },

    // Deal API
    deals: {
        getAll: () => ipcRenderer.invoke('deals:getAll'),
        getById: (id) => ipcRenderer.invoke('deals:getById', id),
        create: (dealData, items) => ipcRenderer.invoke('deals:create', dealData, items),
        update: (id, dealData, items) => ipcRenderer.invoke('deals:update', id, dealData, items),
        delete: (id) => ipcRenderer.invoke('deals:delete', id)
    },

    // Order API
    orders: {
        create: (customerData, items) => ipcRenderer.invoke('orders:create', customerData, items),
        getById: (id) => ipcRenderer.invoke('orders:getById', id),
        getToday: () => ipcRenderer.invoke('orders:getToday'),
        getAll: (limit) => ipcRenderer.invoke('orders:getAll', limit),
        getByDate: (date) => ipcRenderer.invoke('orders:getByDate', date)
    },

    // Report API
    reports: {
        endOfDay: (date) => ipcRenderer.invoke('reports:endOfDay', date),
        dateRange: (startDate, endDate) => ipcRenderer.invoke('reports:dateRange', startDate, endDate),
        topProducts: (limit) => ipcRenderer.invoke('reports:topProducts', limit),
        topDeals: (limit) => ipcRenderer.invoke('reports:topDeals', limit)
    },

    // Print API
    print: {
        receipt: (orderData) => ipcRenderer.invoke('print:receipt', orderData),
        report: (reportData) => ipcRenderer.invoke('print:report', reportData)
    },

    // Backup API
    backup: {
        create: () => ipcRenderer.invoke('backup:create'),
        restore: () => ipcRenderer.invoke('backup:restore'),
        getInfo: () => ipcRenderer.invoke('backup:getInfo'),
        setAutoBackup: (enabled) => ipcRenderer.invoke('backup:setAutoBackup', enabled),
        runAutoBackup: () => ipcRenderer.invoke('backup:runAutoBackup'),
        restartApp: () => ipcRenderer.invoke('app:restart')
    }
});
