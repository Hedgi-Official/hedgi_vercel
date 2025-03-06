
import { db } from "../db";
import { hedges } from "../db/schema";
import { eq } from "drizzle-orm";
import { tradingService } from "../server/services/trading";

async function deleteAllHedgesForUser(username: string) {
  console.log(`Deleting all hedges for user: ${username}`);
  
  // First, get the user ID
  const user = await db.query.users.findFirst({
    where: (users) => eq(users.username, username)
  });
  
  if (!user) {
    console.error(`User ${username} not found`);
    return;
  }
  
  console.log(`Found user ${username} with ID ${user.id}`);
  
  // Get all hedges for this user
  const userHedges = await db.query.hedges.findMany({
    where: eq(hedges.userId, user.id)
  });
  
  if (userHedges.length === 0) {
    console.log(`No hedges found for user ${username}`);
    return;
  }
  
  console.log(`Found ${userHedges.length} hedges for user ${username}`);
  
  // Ensure trading service is connected
  await tradingService.connect();
  
  // Delete each hedge
  for (const hedge of userHedges) {
    console.log(`Processing hedge ID ${hedge.id}...`);
    
    // Close the trade via XTB API if there's a trade order number
    if (hedge.tradeOrderNumber) {
      try {
        const symbol = `${hedge.targetCurrency}${hedge.baseCurrency}`;
        const volume = Math.abs(Number(hedge.amount)) / 100000; // Convert to lots
        const isBuy = Number(hedge.amount) > 0;
        
        console.log(`Closing trade ${hedge.tradeOrderNumber} for ${symbol}`);
        
        // Close the trade with proper parameters
        const closeResponse = await tradingService.closeTrade(
          symbol,
          hedge.tradeOrderNumber,
          volume,
          isBuy,
          `Closing hedge ID ${hedge.id} for ${symbol}`
        );
        
        if (closeResponse.status) {
          const closingOrderNumber = closeResponse.returnData?.order || 0;
          console.log(`Successfully closed trade ${hedge.tradeOrderNumber} with closing order ${closingOrderNumber}`);
        } else {
          console.log(`Trade closure issue: ${closeResponse.message || 'Unknown error'}`);
        }
      } catch (tradeError) {
        console.error(`Error closing trade ${hedge.tradeOrderNumber}:`, tradeError);
      }
    }
    
    // Delete the hedge from the database
    try {
      const [deletedHedge] = await db
        .delete(hedges)
        .where(eq(hedges.id, hedge.id))
        .returning();
      
      console.log(`Deleted hedge ID ${hedge.id} from database`);
    } catch (dbError) {
      console.error(`Error deleting hedge ID ${hedge.id} from database:`, dbError);
    }
  }
  
  console.log(`Completed deletion of hedges for user ${username}`);
}

// Execute the function for user "gzhs"
deleteAllHedgesForUser("gzhs")
  .then(() => {
    console.log("Script execution completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });
