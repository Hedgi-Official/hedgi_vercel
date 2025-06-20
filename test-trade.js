import fetch from 'node-fetch';

// Function to test opening and closing trades
async function testTradeApi() {
  try {
    console.log('Testing trade API...');
    
    // 1. Open a trade 
    console.log('Attempting to open a trade with tickmill...');
    const openResponse = await fetch('https://alleged-gb-activated-immediate.trycloudflare.com/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broker: 'tickmill',
        symbol: 'USDBRL',
        direction: 'buy', 
        volume: 0.1,
        deviation: 5,
        magic: 123456,
        comment: 'Hedgi test trade'
      })
    });
    
    const openData = await openResponse.text();
    console.log('Open trade response:', openData);
    
    let tradeOrderNumber;
    try {
      const openResult = JSON.parse(openData);
      tradeOrderNumber = openResult.order;
      console.log('Trade order number:', tradeOrderNumber);
      
      // Only attempt to close if we got a real order number (not 0)
      if (tradeOrderNumber && tradeOrderNumber !== 0) {
        // 2. Close the trade
        console.log(`Attempting to close trade ${tradeOrderNumber} with tickmill...`);
        console.log('Close request body:', JSON.stringify({
          broker: 'tickmill',
          position: tradeOrderNumber
        }));
        
        const closeResponse = await fetch('https://alleged-gb-activated-immediate.trycloudflare.com/close_trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broker: 'tickmill',
            position: tradeOrderNumber
          })
        });
        
        const closeData = await closeResponse.text();
        console.log('Close trade response:', closeData);
      } else {
        console.log('No valid trade order number received, skipping close operation');
      }
    } catch (parseError) {
      console.error('Error parsing open response:', parseError);
    }
    
    // 3. Test local API endpoints
    console.log('\nTesting local API endpoints...');
    console.log('This would call your local server endpoints');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testTradeApi();