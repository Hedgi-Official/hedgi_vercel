// Import the exact types we need from the schema
import { NewHedge } from "./db/schema";

// Function to demonstrate type checking
function createHedge() {
  // This should show us the correct typing
  const hedge: NewHedge = {
    userId: 1,
    baseCurrency: "USD",
    targetCurrency: "BRL",
    amount: "100.00", // Let's see if this works
    rate: "3.75", // Let's see if this works
    duration: 30,
    status: "active",
    tradeOrderNumber: 12345,
    tradeStatus: "ACTIVE",
  };

  console.log("Successfully created hedge object with these types:", {
    amount: typeof hedge.amount,
    rate: typeof hedge.rate,
    userId: typeof hedge.userId
  });
  
  return hedge;
}

// Call the function to test
createHedge();