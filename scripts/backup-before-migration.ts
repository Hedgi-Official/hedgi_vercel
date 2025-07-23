
import { db } from "@db";
import { trades, users, hedges } from "@db/schema";
import fs from 'fs';

export async function backupCriticalTables() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `./backups/${timestamp}`;
  
  // Create backup directory
  if (!fs.existsSync('./backups')) {
    fs.mkdirSync('./backups');
  }
  fs.mkdirSync(backupDir);
  
  console.log(`[backup] Creating backup in ${backupDir}`);
  
  try {
    // Backup trades (most critical)
    const allTrades = await db.select().from(trades);
    fs.writeFileSync(`${backupDir}/trades-backup.json`, JSON.stringify(allTrades, null, 2));
    console.log(`[backup] Backed up ${allTrades.length} trades`);
    
    // Backup users
    const allUsers = await db.select().from(users);
    fs.writeFileSync(`${backupDir}/users-backup.json`, JSON.stringify(allUsers, null, 2));
    console.log(`[backup] Backed up ${allUsers.length} users`);
    
    // Backup hedges
    const allHedges = await db.select().from(hedges);
    fs.writeFileSync(`${backupDir}/hedges-backup.json`, JSON.stringify(allHedges, null, 2));
    console.log(`[backup] Backed up ${allHedges.length} hedges`);
    
    console.log(`[backup] ✅ Backup completed successfully`);
    return backupDir;
  } catch (error) {
    console.error('[backup] ❌ Backup failed:', error);
    throw error;
  }
}

// Run backup if called directly
if (require.main === module) {
  backupCriticalTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
