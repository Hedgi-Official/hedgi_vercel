import { db } from './db/index.js';
import { trades } from './db/schema.js';

async function testDrizzleInsert() {
  try {
    console.log('Testing Drizzle insertion...');
    
    const tradeData = {
      userId: 2,
      ticket: 'DRIZZLE-TEST-001',
      broker: 'flask',
      volume: 0.05,
      symbol: 'USDBRL',
      openTime: '2025-06-08T08:28:00.000Z',
      durationDays: 14,
      status: 'open',
      flaskTradeId: 999,
      metadata: '{"test":"drizzle"}'
    };

    console.log('Attempting to insert:', tradeData);
    
    const result = await db.insert(trades).values(tradeData).returning();
    console.log('Success! Inserted trade:', result[0]);
    
  } catch (error) {
    console.error('Drizzle insertion failed:', error.message);
    console.error('Full error:', error);
  }
}

testDrizzleInsert();