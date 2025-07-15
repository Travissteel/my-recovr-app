require('dotenv').config();

// For local development, use SQLite. For production, use PostgreSQL
const usePostgreSQL = process.env.DATABASE_URL || process.env.NODE_ENV === 'production';

let db;

if (usePostgreSQL) {
  // PostgreSQL configuration for production
  const { Pool } = require('pg');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'recovr_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
    // Don't exit in development, just log the error
    if (process.env.NODE_ENV === 'production') {
      process.exit(-1);
    }
  });

  db = pool;
} else {
  // SQLite configuration for local development
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const dbPath = path.join(__dirname, '../../recovr_development.db');
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite connection error:', err);
    } else {
      console.log('✅ Connected to SQLite database for development');
    }
  });
  
  // Add query method to match PostgreSQL pool interface
  db.query = function(text, params = []) {
    return new Promise((resolve, reject) => {
      if (text.includes('RETURNING')) {
        // Handle INSERT/UPDATE with RETURNING (PostgreSQL specific)
        const insertText = text.replace(/RETURNING.*$/, '');
        this.run(insertText, params, function(err) {
          if (err) reject(err);
          else resolve({ rows: [{ id: this.lastID }], rowCount: this.changes });
        });
      } else if (text.trim().toUpperCase().startsWith('SELECT')) {
        this.all(text, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows, rowCount: rows.length });
        });
      } else {
        this.run(text, params, function(err) {
          if (err) reject(err);
          else resolve({ rowCount: this.changes });
        });
      }
    });
  };
}

module.exports = db;