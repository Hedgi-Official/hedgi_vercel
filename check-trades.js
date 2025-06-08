import Database from 'better-sqlite3';

const db = new Database('./hedgi.db');

console.log('=== Checking database tables ===');

// Check all trades
const trades = db.prepare('SELECT * FROM trades').all();
console.log('All trades:', trades);

// Check all users
const users = db.prepare('SELECT id, username, email FROM users').all();
console.log('All users:', users);

// Check all hedges
const hedges = db.prepare('SELECT * FROM hedges').all();
console.log('All hedges:', hedges);

db.close();