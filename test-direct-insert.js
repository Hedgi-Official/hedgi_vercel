import Database from 'better-sqlite3';

const db = new Database('./hedgi.db');

// Test direct SQL insertion to see exact field requirements
try {
  // Check current schema
  const schema = db.prepare("PRAGMA table_info(trades)").all();
  console.log('Trades table schema:', schema);

  // Test insertion with exact field names
  const insertStmt = db.prepare(`
    INSERT INTO trades (
      user_id, ticket, broker, volume, symbol, open_time, 
      duration_days, status, flask_trade_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    2,                    // user_id
    'FLASK-TEST-254',     // ticket
    'flask',              // broker
    0.05,                 // volume
    'USDBRL',             // symbol
    '2025-06-08T08:27:26.831223',  // open_time
    14,                   // duration_days
    'open',               // status
    254,                  // flask_trade_id
    '{"days":14,"margin":"500","paymentToken":"test999"}' // metadata
  );

  console.log('Direct insertion successful:', result);

  // Verify it was saved
  const selectStmt = db.prepare('SELECT * FROM trades WHERE flask_trade_id = ?');
  const trade = selectStmt.get(254);
  console.log('Retrieved trade:', trade);

} catch (error) {
  console.error('Direct insertion error:', error);
} finally {
  db.close();
}