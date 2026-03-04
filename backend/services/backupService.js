const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const extract = require('extract-zip');
const CloudBackupService = require('./cloudBackupService');

/**
 * Backup Service
 * Handles database backup and restore operations
 */

class BackupService {
    constructor() {
        this.dbPath = path.join(app.getPath('userData'), 'crunchy-bites.db');
        this.backupDir = path.join(app.getPath('userData'), 'backups');
        this.autoBackupEnabled = true; // Default enabled
        this.maxAutoBackups = 7; // Keep last 7 auto-backups

        this.cloudService = new CloudBackupService();

        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Create manual backup to user-selected location
     */
    async createManualBackup(destinationPath) {
        try {
            if (!fs.existsSync(this.dbPath)) {
                throw new Error('Database file not found');
            }

            // Create metadata
            const metadata = {
                backupDate: new Date().toISOString(),
                appVersion: app.getVersion(),
                dbSize: fs.statSync(this.dbPath).size
            };

            // Create ZIP archive
            const output = fs.createWriteStream(destinationPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            return new Promise((resolve, reject) => {
                output.on('close', () => {
                    resolve({
                        success: true,
                        filePath: destinationPath,
                        size: archive.pointer()
                    });
                });

                archive.on('error', (err) => {
                    reject(err);
                });

                archive.pipe(output);

                // Add database file
                archive.file(this.dbPath, { name: 'crunchy-bites.db' });

                // Add metadata
                archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });

                archive.finalize();
            });
        } catch (error) {
            console.error('Manual backup error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create automatic backup
     */
    async createAutoBackup() {
        try {
            if (!this.autoBackupEnabled) {
                return { success: true, skipped: true, reason: 'Auto-backup disabled' };
            }

            // Check if backup needed (once per day)
            const lastBackupDate = this.getLastAutoBackupDate();
            const now = new Date();
            const hoursSinceLastBackup = lastBackupDate
                ? (now - lastBackupDate) / (1000 * 60 * 60)
                : 25; // Force backup if no previous backup

            if (hoursSinceLastBackup < 24) {
                // Trigger cloud upload for the existing backup if configured
                if (this.cloudService && this.cloudService.getCredentials().isConfigured) {
                    try {
                        const files = fs.readdirSync(this.backupDir)
                            .filter(f => f.startsWith('auto-backup-') && f.endsWith('.zip'))
                            .sort((a, b) => {
                                const statA = fs.statSync(path.join(this.backupDir, a));
                                const statB = fs.statSync(path.join(this.backupDir, b));
                                return statB.mtime - statA.mtime;
                            });

                        if (files.length > 0) {
                            const latestLocalBackup = path.join(this.backupDir, files[0]);
                            console.log('Valid cloud config found. Uploading existing daily backup to cloud...', latestLocalBackup);
                            this.cloudService.uploadBackup(latestLocalBackup);
                        }
                    } catch (err) {
                        console.error('Failed to trigger cloud sync for existing backup:', err);
                    }
                }

                return {
                    success: true,
                    skipped: true,
                    reason: 'Backup already created today',
                    lastBackup: lastBackupDate
                };
            }

            // Create backup filename with date
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const backupFileName = `auto-backup-${dateStr}.zip`;
            const backupPath = path.join(this.backupDir, backupFileName);

            // Create backup
            const result = await this.createManualBackup(backupPath);

            if (result.success) {
                // Clean up old auto-backups locally
                this.cleanupOldAutoBackups();

                // Trigger cloud upload automatically
                if (this.cloudService && this.cloudService.getCredentials().isConfigured) {
                    console.log('Valid cloud config found. Attempting autonomous cloud backup...');
                    this.cloudService.uploadBackup(backupPath);
                }

                return {
                    success: true,
                    filePath: backupPath,
                    size: result.size
                };
            }

            return result;
        } catch (error) {
            console.error('Auto backup error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get date of last auto-backup
     */
    getLastAutoBackupDate() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('auto-backup-') && f.endsWith('.zip'))
                .map(f => {
                    const stats = fs.statSync(path.join(this.backupDir, f));
                    return {
                        name: f,
                        mtime: stats.mtime
                    };
                })
                .sort((a, b) => b.mtime - a.mtime);

            return files.length > 0 ? files[0].mtime : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Clean up old auto-backups, keeping only the most recent ones
     */
    cleanupOldAutoBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('auto-backup-') && f.endsWith('.zip'))
                .map(f => {
                    const stats = fs.statSync(path.join(this.backupDir, f));
                    return {
                        name: f,
                        path: path.join(this.backupDir, f),
                        mtime: stats.mtime
                    };
                })
                .sort((a, b) => b.mtime - a.mtime);

            // Delete old backups beyond the limit
            if (files.length > this.maxAutoBackups) {
                files.slice(this.maxAutoBackups).forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log('Deleted old auto-backup:', file.name);
                });
            }
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    /**
     * Restore backup from ZIP file
     */
    async restoreBackup(zipPath) {
        try {
            console.log('=== RESTORE BACKUP DEBUG ===');
            console.log('ZIP path:', zipPath);
            console.log('Current DB path:', this.dbPath);

            if (!fs.existsSync(zipPath)) {
                throw new Error('Backup file not found');
            }
            console.log('✓ Backup file exists');

            // Create temporary directory for extraction
            const tempDir = path.join(app.getPath('temp'), 'crunchy-bites-restore-' + Date.now());
            fs.mkdirSync(tempDir, { recursive: true });
            console.log('✓ Temp directory created:', tempDir);

            // Extract ZIP
            await extract(zipPath, { dir: tempDir });
            console.log('✓ ZIP extracted');

            // Validate extracted files
            const extractedDbPath = path.join(tempDir, 'crunchy-bites.db');
            const metadataPath = path.join(tempDir, 'backup-metadata.json');

            if (!fs.existsSync(extractedDbPath)) {
                throw new Error('Invalid backup file: database not found');
            }
            console.log('✓ Database found in backup:', extractedDbPath);

            // Read metadata if available
            let metadata = null;
            if (fs.existsSync(metadataPath)) {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                console.log('✓ Metadata:', metadata);
            }

            // Create backup of current database before replacing
            const currentDbBackup = this.dbPath + '.before-restore';
            if (fs.existsSync(this.dbPath)) {
                fs.copyFileSync(this.dbPath, currentDbBackup);
                console.log('✓ Current DB backed up to:', currentDbBackup);
            }

            // Replace current database
            fs.copyFileSync(extractedDbPath, this.dbPath);
            console.log('✓ Database file replaced');
            console.log('  From:', extractedDbPath);
            console.log('  To:', this.dbPath);

            // Clean up temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log('✓ Temp directory cleaned up');

            console.log('=== RESTORE COMPLETED SUCCESSFULLY ===');
            return {
                success: true,
                metadata,
                message: 'Database restored successfully. Please restart the application.'
            };
        } catch (error) {
            console.error('!!! RESTORE ERROR !!!');
            console.error('Restore backup error:', error);
            console.error('Error stack:', error.stack);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get database info
     */
    getDatabaseInfo() {
        try {
            const stats = fs.statSync(this.dbPath);
            const lastBackup = this.getLastAutoBackupDate();

            return {
                success: true,
                path: this.dbPath,
                size: stats.size,
                sizeFormatted: this.formatBytes(stats.size),
                lastModified: stats.mtime,
                lastAutoBackup: lastBackup,
                autoBackupEnabled: this.autoBackupEnabled,
                cloudConfigured: this.cloudService.getCredentials().isConfigured
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Format bytes to human-readable size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Toggle auto-backup
     */
    setAutoBackupEnabled(enabled) {
        this.autoBackupEnabled = enabled;
        return { success: true, enabled };
    }
}

module.exports = BackupService;
