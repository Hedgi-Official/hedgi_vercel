import Database from 'better-sqlite3';

const db = new Database('./hedgi.db');

console.log('=== TRADES TABLE STRUCTURE ===');
const pragma = db.prepare("PRAGMA table_info(trades)").all();
console.log(pragma);

console.log('\n=== SAMPLE TRADES DATA ===');
const trades = db.prepare("SELECT id, flask_trade_id, symbol, volume, status, user_id FROM trades LIMIT 5").all();
console.log(trades);

db.close();