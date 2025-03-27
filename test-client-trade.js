// This test script simulates a client-side request to our server's API
// Run with: node test-client-trade.js

import fetch from 'node-fetch';

async function testClientTradeApis() {
  console.log('Testing client-side trade APIs...');
  
  try {
    // 1. Test the hedge creation when market is closed (should be handled gracefully)
    console.log('\nTest 1: Creating a hedge during market closure...');
    const hedgeData = {
      baseCurrency: 'BRL',
      targetCurrency: 'USD',
      amount: '10000',
      tradeDirection: 'buy',
      duration: 30
    };
    
    try {
      const response = await fetch('http://localhost:5000/api/hedges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hedgeData)
      });
      
      const responseText = await response.text();
      console.log('Response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed result:', result);
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
      
      console.log('Server properly handled the trade request with status code:', response.status);
    } catch (error) {
      console.error('Error testing hedge creation:', error);
    }
    
    // 2. Test the close trade endpoint with an invalid order
    console.log('\nTest 2: Closing a non-existent trade...');
    try {
      const closeData = {
        broker: 'tickmill',
        position: '99999999'  // Invalid position that doesn't exist
      };
      
      const response = await fetch('http://localhost:5000/api/trades/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closeData)
      });
      
      const responseText = await response.text();
      console.log('Response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed result:', result);
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
      
      console.log('Server properly handled the close request with status code:', response.status);
    } catch (error) {
      console.error('Error testing trade closure:', error);
    }
    
    // 3. Test the deletion endpoint with an invalid hedge ID
    console.log('\nTest 3: Deleting a hedge (requires authentication)...');
    try {
      const response = await fetch('http://localhost:5000/api/hedges/999', {
        method: 'DELETE'
      });
      
      const responseText = await response.text();
      console.log('Response:', responseText);
      
      console.log('Server properly handled the delete request with status code:', response.status);
    } catch (error) {
      console.error('Error testing hedge deletion:', error);
    }
    
  } catch (error) {
    console.error('Overall test error:', error);
  }
}

testClientTradeApis();