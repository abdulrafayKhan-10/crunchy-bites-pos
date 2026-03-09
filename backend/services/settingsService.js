const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DEFAULT_PASSWORD = 'admin224466';

class SettingsService {
    constructor() {
        this.settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
        this.settings = this.loadSettings();
    }

    loadSettings() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                return JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            }
        } catch (e) {
            console.error('Settings load error:', e);
        }
        return {};
    }

    saveSettings() {
        try {
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
        } catch (e) {
            console.error('Settings save error:', e);
        }
    }

    hashPassword(plain) {
        return crypto.createHash('sha256').update(plain).digest('hex');
    }

    verifyPassword(plain) {
        const stored = this.settings.adminPasswordHash;
        if (!stored) {
            // No custom password set — use the default
            return plain === DEFAULT_PASSWORD;
        }
        return this.hashPassword(plain) === stored;
    }

    changePassword(oldPlain, newPlain) {
        if (!this.verifyPassword(oldPlain)) {
            return { success: false, error: 'Current password is incorrect' };
        }
        if (!newPlain || newPlain.length < 4) {
            return { success: false, error: 'New password must be at least 4 characters' };
        }
        this.settings.adminPasswordHash = this.hashPassword(newPlain);
        this.saveSettings();
        return { success: true };
    }
}

module.exports = SettingsService;
