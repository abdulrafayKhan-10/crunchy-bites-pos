
// ============ SETTINGS / BACKUP FUNCTIONS ============

async function loadDatabaseInfo() {
    try {
        const result = await window.api.backup.getInfo();

        if (result.success) {
            document.getElementById('dbPath').textContent = result.path;
            document.getElementById('dbSize').textContent = result.sizeFormatted;

            if (result.lastAutoBackup) {
                const date = new Date(result.lastAutoBackup);
                document.getElementById('lastBackup').textContent = date.toLocaleString();
            } else {
                document.getElementById('lastBackup').textContent = 'Never';
            }

            document.getElementById('autoBackupToggle').checked = result.autoBackupEnabled;

            // Load Cloud Config
            const cloudConfig = await window.api.backup.getCloudCredentials();
            if (cloudConfig.success && cloudConfig.data.isConfigured) {
                document.getElementById('supabaseUrl').value = cloudConfig.data.url;
                document.getElementById('supabaseKey').value = cloudConfig.data.key;
                document.getElementById('supabaseBucket').value = cloudConfig.data.bucket;
                document.getElementById('cloudStatus').textContent = '✅ Cloud Backup Configured & Active';
                document.getElementById('restoreCloudBtn').style.display = 'block';
            } else {
                document.getElementById('cloudStatus').textContent = '⚠️ Cloud Backup Not Configured';
                document.getElementById('restoreCloudBtn').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading database info:', error);
        showToast('Error loading database info', 'error');
    }
}

async function createBackup() {
    try {
        const result = await window.api.backup.create();

        if (result.canceled) {
            return;
        }

        if (result.success) {
            showToast('Backup created successfully!', 'success');
            loadDatabaseInfo(); // Refresh info
        } else {
            showToast('Error creating backup: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Backup error:', error);
        showToast('Error creating backup', 'error');
    }
}

async function restoreBackup() {
    console.log('=== RESTORE BACKUP CLICKED ===');

    if (!confirm('⚠️ WARNING: This will replace your current database with the backup.\\n\\nMake sure you have a recent backup before proceeding.\\n\\nContinue?')) {
        console.log('User canceled restore');
        return;
    }

    try {
        console.log('Calling window.api.backup.restore()...');
        const result = await window.api.backup.restore();
        console.log('Restore result:', result);

        if (result.canceled) {
            console.log('File selection canceled');
            return;
        }

        if (result.success) {
            console.log('Restore successful! Restarting app...');
            alert('✅ Backup restored successfully!\\n\\nThe application will now restart to load the restored database.');
            // Restart the entire app to reload database from disk
            await window.api.backup.restartApp();
        } else {
            console.error('Restore failed:', result.error);
            showToast('Error restoring backup: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Restore error:', error);
        showToast('Error restoring backup', 'error');
    }
}

async function toggleAutoBackup() {
    const enabled = document.getElementById('autoBackupToggle').checked;

    try {
        const result = await window.api.backup.setAutoBackup(enabled);

        if (result.success) {
            showToast(`Auto-backup ${enabled ? 'enabled' : 'disabled'}`, 'success');
        }
    } catch (error) {
        console.error('Toggle auto-backup error:', error);
        showToast('Error updating auto-backup setting', 'error');
    }
}

// Event listeners for Settings
document.getElementById('createBackupBtn')?.addEventListener('click', createBackup);
document.getElementById('restoreBackupBtn')?.addEventListener('click', restoreBackup);
document.getElementById('autoBackupToggle')?.addEventListener('change', toggleAutoBackup);

// Cloud Setup
document.getElementById('saveCloudBtn')?.addEventListener('click', async () => {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    const bucket = document.getElementById('supabaseBucket').value.trim() || 'pos-backups';
    const statusEl = document.getElementById('cloudStatus');

    if (!url || !key) {
        showToast('Please enter both Supabase URL and API Key', 'error');
        return;
    }

    statusEl.textContent = 'Testing connection...';
    statusEl.style.color = 'var(--text-light)';

    const saveResult = await window.api.backup.saveCloudCredentials(url, key, bucket);

    if (saveResult.success) {
        const testResult = await window.api.backup.testCloudConnection();
        if (testResult.success) {
            statusEl.textContent = '✅ Cloud Connected! Running Disaster Recovery Check...';
            statusEl.style.color = '#38a169'; // Greenish
            showToast('Cloud credentials verified & saved', 'success');

            // Check for Auto Recovery if Db is empty
            const recoveryResult = await window.api.backup.recoverFromCloud();
            if (recoveryResult && recoveryResult.success) {
                alert('✅ Disaster Auto-Recovery Successful!\\n\\nData found on cloud and restored.\\nThe application will now restart.');
                await window.api.backup.restartApp();
            } else {
                statusEl.textContent = '✅ Cloud Connected & Active';
                document.getElementById('restoreCloudBtn').style.display = 'block';
            }
        } else {
            statusEl.textContent = '❌ Cloud Connection Failed: ' + testResult.error;
            statusEl.style.color = '#e53e3e'; // Reddish
        }
    } else {
        showToast('Error saving credentials', 'error');
    }
});

document.getElementById('restoreCloudBtn')?.addEventListener('click', async () => {
    if (!confirm('⚠️ WARNING: This will replace your current local database with the latest cloud backup.\\n\\nContinue?')) {
        return;
    }

    const btn = document.getElementById('restoreCloudBtn');
    btn.textContent = 'Downloading...';
    btn.disabled = true;

    try {
        const result = await window.api.backup.downloadLatestCloudBackup();

        if (result.success) {
            alert('✅ Cloud Backup restored successfully!\\n\\nThe application will now restart.');
            await window.api.backup.restartApp();
        } else {
            showToast('Error restoring cloud backup: ' + result.error, 'error');
        }
    } catch (err) {
        console.error('Cloud restore error:', err);
        showToast('Critical error restoring cloud backup', 'error');
    } finally {
        btn.textContent = '☁️ Restore Latest Download';
        btn.disabled = false;
    }
});
