import { db } from "../db";
import { hedges } from "../db/schema";
import { eq } from "drizzle-orm";

async function deleteAllHedgesForUser(username: string) {
  console.log(`Deleting all hedges for user: ${username} (database only)`);

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

  // Delete each hedge from database only (no XTB interaction)
  for (const hedge of userHedges) {
    try {
      const [deletedHedge] = await db
        .delete(hedges)
        .where(eq(hedges.id, hedge.id))
        .returning();

      console.log(`Deleted hedge ID ${hedge.id} from database (trade ${hedge.tradeOrderNumber} was NOT closed on XTB)`);
    } catch (dbError) {
      console.error(`Error deleting hedge ID ${hedge.id} from database:`, dbError);
    }
  }

  console.log(`Completed deletion of hedges for user ${username} from database only`);
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