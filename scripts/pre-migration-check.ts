
import { db } from "@db";
import { trades } from "@db/schema";
import { sql } from "drizzle-orm";

export async function preMigrationCheck() {
  console.log('[pre-migration] Running safety checks...');
  
  try {
    // Check current trade count
    const [{ count }] = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(trades);
    
    console.log(`[pre-migration] Current trades count: ${count}`);
    
    // Check foreign key constraints exist
    const constraints = await db.execute(sql`
      SELECT constraint_name, table_name 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_name = 'trades'
    `);
    
    console.log('[pre-migration] Current foreign key constraints:', constraints.rows);
    
    if (constraints.rows.length === 0) {
      console.warn('⚠️  WARNING: No foreign key constraints found on trades table!');
    }
    
    // Warn if about to run destructive migration
    console.log('⚠️  IMPORTANT: Make sure to backup before running any migrations that:');
    console.log('   - DROP CONSTRAINT statements');
    console.log('   - ALTER COLUMN data types');
    console.log('   - DROP or TRUNCATE tables');
    
    return { tradesCount: count, constraintsCount: constraints.rows.length };
  } catch (error) {
    console.error('[pre-migration] Check failed:', error);
    throw error;
  }
}

if (require.main === module) {
  preMigrationCheck()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
