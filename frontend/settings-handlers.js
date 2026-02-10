
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
    if (!confirm('⚠️ WARNING: This will replace your current database with the backup.\\n\\nMake sure you have a recent backup before proceeding.\\n\\nContinue?')) {
        return;
    }

    try {
        const result = await window.api.backup.restore();

        if (result.canceled) {
            return;
        }

        if (result.success) {
            alert('✅ Backup restored successfully!\\n\\nThe application will now restart to load the restored database.');
            location.reload();
        } else {
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
