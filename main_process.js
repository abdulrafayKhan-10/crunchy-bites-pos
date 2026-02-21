const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, closeDatabase } = require('./database/db');
const { setupIpcHandlers } = require('./backend/ipc/handlers');

/**
 * Main Electron Process
 * Initializes the application, database, and creates the main window
 */

// File logging removed
// const logFile = ...

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    // Load the frontend
    mainWindow.loadFile('frontend/index.html');

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Initialize app
app.whenReady().then(async () => {
    console.log('=== Crunchy Bites POS starting ===');

    try {
        console.log('Step 1: Initializing database...');
        await initDatabase();
        console.log('✓ Database initialized');

        console.log('Step 2: Setting up IPC handlers...');
        setupIpcHandlers();
        console.log('✓ IPC handlers ready');

        console.log('Step 3: Creating main window...');
        createWindow();
        console.log('✓ Application window created');

        console.log('Step 4: Running auto-backup...');
        const BackupService = require('./backend/services/backupService');
        const backupService = new BackupService();
        const backupResult = await backupService.createAutoBackup();
        if (backupResult.success && !backupResult.skipped) {
            console.log('✓ Auto-backup created');
        } else if (backupResult.skipped) {
            console.log('✓ Auto-backup skipped:', backupResult.reason);
        }

        console.log('=== Application started successfully ===');
    } catch (error) {
        console.error('!!! Application initialization error !!!');
        console.error('Error:', error);
        console.error('Stack:', error.stack);

        // Don't quit immediately, show error dialog
        const { dialog } = require('electron');
        dialog.showErrorBox('Startup Error', `Failed to start application:\n\n${error.message}\n\nCheck console for details.`);

        setTimeout(() => app.quit(), 5000);
    }
});

// macOS specific: Re-create window when dock icon is clicked
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        closeDatabase();
        app.quit();
    }
});

// Clean up on quit
app.on('before-quit', () => {
    closeDatabase();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
