const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const Store = require('electron-store');
const { app } = require('electron');

/**
 * Cloud Backup Service
 * Manages uploading and downloading backups to/from Supabase Storage
 */

class CloudBackupService {
    constructor() {
        this.store = new Store();

        // Load credentials from store
        this.supabaseUrl = this.store.get('supabaseUrl') || '';
        this.supabaseKey = this.store.get('supabaseKey') || '';
        this.bucketName = this.store.get('supabaseBucket') || 'pos-backups';

        this.client = null;
        if (this.supabaseUrl && this.supabaseKey) {
            this.initClient(this.supabaseUrl, this.supabaseKey, this.bucketName);
        }
    }

    initClient(url, key, bucket) {
        try {
            this.client = createClient(url, key);
            this.supabaseUrl = url;
            this.supabaseKey = key;
            this.bucketName = bucket;

            // Save to store
            this.store.set('supabaseUrl', url);
            this.store.set('supabaseKey', key);
            this.store.set('supabaseBucket', bucket);

            return { success: true };
        } catch (error) {
            console.error('Failed to init Supabase client:', error);
            return { success: false, error: error.message };
        }
    }

    getCredentials() {
        return {
            url: this.supabaseUrl,
            key: this.supabaseKey,
            bucket: this.bucketName,
            isConfigured: !!(this.supabaseUrl && this.supabaseKey)
        };
    }

    async testConnection() {
        if (!this.client) return { success: false, error: 'Client not deeply configured' };
        try {
            // Just try to list buckets to test auth
            const { data, error } = await this.client.storage.getBucket(this.bucketName);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Connection test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Upload a local backup ZIP to Supabase
     */
    async uploadBackup(zipFilePath) {
        if (!this.client) return { success: true, skipped: true, reason: 'Cloud backup not configured' };

        try {
            console.log(`Starting cloud upload for ${zipFilePath}...`);
            const fileName = path.basename(zipFilePath);
            const fileBuffer = fs.readFileSync(zipFilePath);

            const { data, error } = await this.client
                .storage
                .from(this.bucketName)
                .upload(fileName, fileBuffer, {
                    contentType: 'application/zip',
                    upsert: true
                });

            if (error) throw error;

            console.log(`Cloud upload successful: ${fileName}`);

            // After successful upload, prune old backups
            await this.pruneOldBackups();

            return { success: true, data };
        } catch (error) {
            console.error('Cloud upload failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Download the latest backup from Supabase to a local temp file
     */
    async downloadLatestBackup() {
        if (!this.client) return { success: false, error: 'Cloud backup not configured' };

        try {
            // 1. Get list of all files
            const { data: files, error } = await this.client
                .storage
                .from(this.bucketName)
                .list();

            if (error) throw error;

            const zipFiles = files.filter(f => f.name.endsWith('.zip'));
            if (zipFiles.length === 0) {
                return { success: false, error: 'No backups found in cloud' };
            }

            // 2. Sort by creation time descending (newest first)
            zipFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const latestFile = zipFiles[0].name;

            console.log(`Downloading latest cloud backup: ${latestFile}`);

            // 3. Download the file
            const { data: fileData, error: downloadError } = await this.client
                .storage
                .from(this.bucketName)
                .download(latestFile);

            if (downloadError) throw downloadError;

            // 4. Save to temp local location
            const tempPath = path.join(app.getPath('temp'), latestFile);
            const buffer = Buffer.from(await fileData.arrayBuffer());
            fs.writeFileSync(tempPath, buffer);

            return { success: true, filePath: tempPath };
        } catch (error) {
            console.error('Cloud download failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * List all cloud backups
     */
    async listBackups() {
        if (!this.client) return { success: false, error: 'Cloud backup not configured' };
        try {
            const { data, error } = await this.client.storage.from(this.bucketName).list();
            if (error) throw error;

            const files = data.filter(f => f.name.endsWith('.zip'))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            return { success: true, files };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Prune files older than 180 days (approx 6 months)
     */
    async pruneOldBackups() {
        if (!this.client) return;

        try {
            const { data: files, error } = await this.client
                .storage
                .from(this.bucketName)
                .list();

            if (error) throw error;

            const now = new Date();
            const maxDays = 180;
            const filesToDelete = [];

            files.forEach(file => {
                if (!file.name.endsWith('.zip')) return;

                const fileDate = new Date(file.created_at);
                const diffTime = Math.abs(now - fileDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > maxDays) {
                    filesToDelete.push(file.name);
                }
            });

            if (filesToDelete.length > 0) {
                console.log(`Pruning ${filesToDelete.length} old cloud backups...`);
                const { error: deleteError } = await this.client
                    .storage
                    .from(this.bucketName)
                    .remove(filesToDelete);

                if (deleteError) throw deleteError;
                console.log('Cloud prune successful');
            }
        } catch (error) {
            console.error('Failed to prune old cloud backups:', error);
        }
    }
}

module.exports = CloudBackupService;
