const { getDatabase, saveDatabase } = require('../database/db');
const { app } = require('electron');
const path = require('path');

/**
 * Database Helper
 * Provides better-sqlite3-like API for sql.js
 */

class DbHelper {
    constructor() {
        this.db = null;
        this.dbPath = null;
    }

    _getDb() {
        if (!this.db) {
            this.db = getDatabase();
            this.dbPath = path.join(app.getPath('userData'), 'crunchy-bites.db');
        }
        return this.db;
    }

    /**
     * Prepare a statement (returns helper object with get/all/run methods)
     */
    prepare(sql) {
        const db = this._getDb();
        const dbPath = this.dbPath;

        return {
            get(...params) {
                try {
                    const stmt = db.prepare(sql);
                    stmt.bind(params);
                    const hasRow = stmt.step();
                    if (hasRow) {
                        const row = stmt.getAsObject();
                        stmt.free();
                        return row;
                    }
                    stmt.free();
                    return null;
                } catch (error) {
                    console.error('SQL Error (get):', error, sql, params);
                    throw error;
                }
            },

            all(...params) {
                try {
                    const stmt = db.prepare(sql);
                    stmt.bind(params);
                    const rows = [];
                    while (stmt.step()) {
                        rows.push(stmt.getAsObject());
                    }
                    stmt.free();
                    return rows;
                } catch (error) {
                    console.error('SQL Error (all):', error, sql, params);
                    throw error;
                }
            },

            run(...params) {
                try {
                    const stmt = db.prepare(sql);
                    stmt.bind(params);
                    stmt.step();
                    stmt.free();

                    // Get last insert rowid
                    const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
                    lastIdStmt.step();
                    const lastId = lastIdStmt.getAsObject().id;
                    lastIdStmt.free();

                    // Save database after modification
                    saveDatabase(dbPath);

                    return {
                        lastInsertRowid: lastId,
                        changes: 1
                    };
                } catch (error) {
                    console.error('SQL Error (run):', error, sql, params);
                    throw error;
                }
            }
        };
    }

    /**
     * Execute SQL directly
     */
    exec(sql) {
        try {
            this._getDb().run(sql);
            saveDatabase(this.dbPath);
        } catch (error) {
            console.error('SQL Error (exec):', error, sql);
            throw error;
        }
    }

    /**
     * Transaction wrapper
     */
    transaction(fn) {
        return (...args) => {
            const db = this._getDb();
            try {
                // sql.js doesn't support transactions the same way
                // Just execute the function and save after
                const result = fn(...args);
                saveDatabase(this.dbPath);
                return result;
            } catch (error) {
                console.error('Transaction error:', error);
                throw error;
            }
        };
    }
}

module.exports = DbHelper;
