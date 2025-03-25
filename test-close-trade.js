/**
 * Test script for verifying trade closing functionality
 * This script opens a trade and then immediately attempts to close it
 */
import fetch from 'node-fetch';

// Using a delay to ensure the order is registered
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testTradeClosing() {
  try {
    console.log('=== TRADE CLOSING TEST ===');
    console.log('Step 1: Opening a new trade with Tickmill');

    // Use USDMXN which seems to be available during current market hours
    const openResponse = await fetch('http://localhost:5000/api/test-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broker: 'tickmill',
        symbol: 'USDMXN',
        direction: 'buy',
        volume: 0.01,
        autoClose: false
      })
    });

    const openData = await openResponse.json();
    console.log('Open trade response:', JSON.stringify(openData, null, 2));

    if (!openData.status) {
      console.error('Failed to open trade:', openData.error || openData.message);
      return;
    }

    // Extract both order and deal numbers for testing
    const orderNumber = openData.result.order;
    const dealNumber = openData.result.deal;

    console.log(`Opened trade with Order: ${orderNumber} / Deal: ${dealNumber}`);

    // Wait a moment to ensure the order is registered in the broker system
    console.log('Waiting 3 seconds for order to be registered...');
    await delay(3000);

    // Now try to close using order number
    console.log('\nStep 2: Attempting to close trade using ORDER number');
    const closeResponse1 = await fetch('http://localhost:5000/api/test-close-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broker: 'tickmill',
        position: orderNumber
      })
    });

    const closeData1 = await closeResponse1.json();
    console.log('Close response (using ORDER):', JSON.stringify(closeData1, null, 2));

    // If the first attempt failed, try with the deal number
    if (!closeData1.status || (closeData1.result && closeData1.result.error)) {
      console.log('\nClose with ORDER number failed - trying with DEAL number');
      const closeResponse2 = await fetch('http://localhost:5000/api/test-close-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker: 'tickmill',
          position: dealNumber
        })
      });

      const closeData2 = await closeResponse2.json();
      console.log('Close response (using DEAL):', JSON.stringify(closeData2, null, 2));
    }

    console.log('\nTest completed!');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testTradeClosing().catch(console.error);