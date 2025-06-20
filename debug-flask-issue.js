// Debug Flask connection issue
import fetch from 'node-fetch';

const testUrl = 'https://digit-tricks-dense-fundamental.trycloudflare.com/symbol_info?symbol=USDBRL&broker=activetrades';

console.log('Testing Flask connection with different configurations...\n');

// Test 1: Basic request
try {
  console.log('Test 1: Basic request');
  const response1 = await fetch(testUrl);
  console.log('Status:', response1.status);
  const data1 = await response1.json();
  console.log('Response:', JSON.stringify(data1, null, 2));
} catch (error) {
  console.error('Test 1 failed:', error.message);
}

console.log('\n---\n');

// Test 2: With proper headers
try {
  console.log('Test 2: With curl headers');
  const response2 = await fetch(testUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'curl/8.11.1'
    }
  });
  console.log('Status:', response2.status);
  const data2 = await response2.json();
  console.log('Response:', JSON.stringify(data2, null, 2));
} catch (error) {
  console.error('Test 2 failed:', error.message);
}

console.log('\n---\n');

// Test 3: With timeout
try {
  console.log('Test 3: With 10s timeout');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  const response3 = await fetch(testUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'curl/8.11.1'
    },
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  console.log('Status:', response3.status);
  const data3 = await response3.json();
  console.log('Response:', JSON.stringify(data3, null, 2));
} catch (error) {
  console.error('Test 3 failed:', error.message);
}