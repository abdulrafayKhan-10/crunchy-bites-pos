const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const DbHelper = require('../../database/dbHelper');

const DEFAULT_PASSWORD = 'admin224466';
const DEFAULT_BUSINESS_DAY_START_HOUR = 6;
const MIN_BUSINESS_DAY_START_HOUR = 0;
const MAX_BUSINESS_DAY_START_HOUR = 23;

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

    recalculateBusinessDates(startHour) {
        try {
            const db = new DbHelper();
            const orderStmt = db.prepare(`
                UPDATE orders
                SET business_date = CASE
                    WHEN CAST(strftime('%H', order_date) AS INTEGER) < ? THEN DATE(order_date, '-1 day')
                    ELSE DATE(order_date)
                END
            `);
            orderStmt.run(startHour);

            const expenseStmt = db.prepare(`
                UPDATE expenses
                SET business_date = CASE
                    WHEN CAST(strftime('%H', date) AS INTEGER) < ? THEN DATE(date, '-1 day')
                    ELSE DATE(date)
                END
            `);
            expenseStmt.run(startHour);
        } catch (e) {
            console.error('Business date recalculation error:', e);
            throw e;
        }
    }

    refreshSettings() {
        this.settings = this.loadSettings();
    }

    hashPassword(plain) {
        return crypto.createHash('sha256').update(plain).digest('hex');
    }

    verifyPassword(plain) {
        this.refreshSettings();
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

    getBusinessDayStartHour() {
        this.refreshSettings();
        const configuredHour = Number(this.settings.businessDayStartHour);

        if (!Number.isInteger(configuredHour)) {
            return DEFAULT_BUSINESS_DAY_START_HOUR;
        }

        if (configuredHour < MIN_BUSINESS_DAY_START_HOUR || configuredHour > MAX_BUSINESS_DAY_START_HOUR) {
            return DEFAULT_BUSINESS_DAY_START_HOUR;
        }

        return configuredHour;
    }

    setBusinessDayStartHour(hour) {
        const parsedHour = Number(hour);

        if (!Number.isInteger(parsedHour)) {
            return { success: false, error: 'Business day start hour must be a whole number' };
        }

        if (parsedHour < MIN_BUSINESS_DAY_START_HOUR || parsedHour > MAX_BUSINESS_DAY_START_HOUR) {
            return { success: false, error: 'Business day start hour must be between 0 and 23' };
        }

        this.settings.businessDayStartHour = parsedHour;
        this.saveSettings();

        this.recalculateBusinessDates(parsedHour);

        return {
            success: true,
            data: {
                businessDayStartHour: parsedHour
            }
        };
    }

    getBusinessDayConfig() {
        return {
            success: true,
            data: {
                businessDayStartHour: this.getBusinessDayStartHour(),
                defaultBusinessDayStartHour: DEFAULT_BUSINESS_DAY_START_HOUR,
                minBusinessDayStartHour: MIN_BUSINESS_DAY_START_HOUR,
                maxBusinessDayStartHour: MAX_BUSINESS_DAY_START_HOUR
            }
        };
    }
}

module.exports = SettingsService;
