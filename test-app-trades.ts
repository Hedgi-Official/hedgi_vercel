import { tradingService } from "./server/services/trading";

async function testTradingOperations() {
  console.log("\n===== Testing Trading Service =====");
  
  // Step 1: Connect to the trading service
  console.log("\nStep 1: Connecting to trading service...");
  const connected = await tradingService.connect();
  
  if (!connected) {
    console.error("❌ Failed to connect to trading service. Aborting test.");
    return;
  }
  
  console.log("✅ Successfully connected to trading service");
  
  // Step 2: Open a test trade
  console.log("\nStep 2: Opening a test trade...");
  const symbol = "EURUSD";
  const volume = 0.1; // 0.1 lots = 10,000 units
  const isBuy = true;
  
  const openResponse = await tradingService.openTrade(
    symbol,
    volume,
    isBuy,
    "Test trade from app"
  );
  
  console.log("Open trade response:", JSON.stringify(openResponse, null, 2));
  
  if (!openResponse.status || !openResponse.returnData?.order) {
    console.error("❌ Failed to open trade. Aborting test.");
    return;
  }
  
  const orderNumber = openResponse.returnData.order;
  console.log(`✅ Successfully opened trade with order number: ${orderNumber}`);
  
  // Step 3: Wait a bit before closing
  console.log("\nWaiting 5 seconds before closing the trade...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 4: Close the trade
  console.log("\nStep 3: Closing the test trade...");
  console.log(`Using order number ${orderNumber} to close the trade`);
  
  const closeResponse = await tradingService.closeTrade(
    symbol,
    orderNumber,
    volume,
    isBuy,
    "Closing test trade"
  );
  
  console.log("Close trade response:", JSON.stringify(closeResponse, null, 2));
  
  if (closeResponse.status) {
    console.log("✅ Successfully closed trade");
  } else {
    console.error("❌ Failed to close trade:", closeResponse.error || "Unknown error");
  }
  
  console.log("\n===== Test Completed =====");
}

// Run the test
testTradingOperations().catch(error => {
  console.error("Unhandled error during test:", error);
});