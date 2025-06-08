import Database from 'better-sqlite3';

const db = new Database('./hedgi.db');

// Test inserting a trade with proper data types
try {
  const insertStmt = db.prepare(`
    INSERT INTO trades (
      user_id, ticket, broker, volume, symbol, open_time, 
      duration_days, status, flask_trade_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(
    2, // userId
    'FLASK-249', // ticket
    'flask', // broker
    0.1, // volume (number)
    'USDBRL', // symbol
    new Date().toISOString(), // openTime
    7, // durationDays (number)
    'open', // status
    249, // flaskTradeId (number)
    JSON.stringify({ days: 7, margin: '390', paymentToken: '1323641978' }) // metadata (JSON string)
  );

  console.log('Trade inserted successfully:', result);

  // Verify it was saved
  const selectStmt = db.prepare('SELECT * FROM trades WHERE user_id = ?');
  const trades = selectStmt.all(2);
  console.log('Trades for user 2:', trades);

} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}