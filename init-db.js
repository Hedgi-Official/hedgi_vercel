import Database from 'better-sqlite3';
import path from 'path';

// Create SQLite database
const dbPath = './hedgi.db';
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    nation TEXT,
    payment_identifier TEXT,
    cpf TEXT,
    ssn TEXT,
    birthdate TEXT,
    address TEXT,
    document_numbers TEXT DEFAULT '{}',
    additional_fields TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    google_calendar_enabled INTEGER DEFAULT 0,
    google_refresh_token TEXT
  );

  CREATE TABLE IF NOT EXISTS hedges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    base_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    amount REAL NOT NULL,
    rate REAL NOT NULL,
    duration INTEGER NOT NULL,
    margin REAL,
    status TEXT NOT NULL,
    broker TEXT DEFAULT 'tickmill',
    trade_order_number TEXT,
    trade_status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TEXT,
    tradeDirection TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ticket TEXT NOT NULL,
    broker TEXT NOT NULL,
    volume REAL NOT NULL,
    symbol TEXT NOT NULL,
    open_time TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    closed_at TEXT,
    hedge_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    flask_trade_id INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    enable_rls INTEGER NOT NULL DEFAULT 0
  );
`);

console.log('Database initialized successfully!');
db.close();