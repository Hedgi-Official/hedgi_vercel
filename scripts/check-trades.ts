
import { db } from '@db';
import { trades, users } from '@db/schema';
import { eq, desc, count } from 'drizzle-orm';

async function checkTrades() {
  try {
    console.log('🔍 Checking trades in database...\n');

    // Get total count of all trades
    const totalTrades = await db.select({ count: count() }).from(trades);
    console.log(`📊 Total trades in database: ${totalTrades[0].count}`);

    // Get trades grouped by user
    const tradesByUser = await db
      .select({
        userId: trades.userId,
        count: count(),
      })
      .from(trades)
      .groupBy(trades.userId);

    console.log('\n👥 Trades by user:');
    for (const userTrades of tradesByUser) {
      console.log(`   User ${userTrades.userId}: ${userTrades.count} trades`);
    }

    // Get all trades with details, ordered by creation date
    const allTrades = await db
      .select()
      .from(trades)
      .orderBy(desc(trades.createdAt))
      .limit(50); // Limit to last 50 trades

    console.log('\n📋 Recent trades (last 50):');
    console.log('ID | User | Ticket | Symbol | Status | Created | Flask ID');
    console.log('---|------|--------|--------|--------|---------|----------');
    
    for (const trade of allTrades) {
      const createdDate = trade.createdAt.toISOString().split('T')[0];
      console.log(
        `${trade.id.toString().padEnd(3)} | ${trade.userId.toString().padEnd(4)} | ${(trade.ticket || 'N/A').padEnd(6)} | ${(trade.symbol || 'N/A').padEnd(6)} | ${trade.status.padEnd(6)} | ${createdDate} | ${trade.flaskTradeId || 'N/A'}`
      );
    }

    // Check for trades older than a certain date
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oldTrades = await db
      .select({ count: count() })
      .from(trades)
      .where(lt(trades.createdAt, oneWeekAgo));

    console.log(`\n📅 Trades older than 1 week: ${oldTrades[0].count}`);

    // Check if there are any users in the database
    const allUsers = await db.select().from(users);
    console.log(`\n👤 Total users in database: ${allUsers.length}`);

  } catch (error) {
    console.error('❌ Error checking trades:', error);
  }
}

// Add missing import
import { lt } from 'drizzle-orm';

checkTrades().then(() => {
  console.log('\n✅ Trade check completed');
  process.exit(0);
});
