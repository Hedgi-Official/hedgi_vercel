/**
 * Test script for the forgot password functionality
 */

const testForgotPassword = async () => {
  console.log('Testing forgot password functionality...');
  
  try {
    // Test 1: Valid email
    console.log('\n1. Testing forgot password with valid email...');
    const response1 = await fetch('http://localhost:5000/api/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    
    const result1 = await response1.json();
    console.log('Response:', result1);
    
    // Test 2: Invalid email
    console.log('\n2. Testing forgot password with invalid email...');
    const response2 = await fetch('http://localhost:5000/api/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nonexistent@example.com'
      })
    });
    
    const result2 = await response2.json();
    console.log('Response:', result2);
    
    // Test 3: Missing email
    console.log('\n3. Testing forgot password without email...');
    const response3 = await fetch('http://localhost:5000/api/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const result3 = await response3.json();
    console.log('Response:', result3);
    
    console.log('\n✅ Forgot password tests completed');
    
  } catch (error) {
    console.error('❌ Error testing forgot password:', error);
  }
};

testForgotPassword();