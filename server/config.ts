/**
 * Application configuration
 * This module provides access to configuration variables for the application
 */

import * as dotenv from 'dotenv';

// Load variables from .env file
dotenv.config();

// Payment configuration
export const PAYMENT_CONFIG = {
  // Control whether payments are enabled
  ENABLED: process.env.ENABLE_PAYMENTS === 'true', // Enable payments if ENABLE_PAYMENTS=true
  SIMULATE_PAYMENTS: false, // Disable payment simulation
  BR_PUBLIC_KEY: process.env.MP_BR_PUBLIC_KEY || 'TEST-f0fe8e15-aed0-4b3c-ac0f-35269b1793f3',
  BR_ACCESS_TOKEN: process.env.MP_BR_ACCESS_TOKEN || 'TEST-7843631683060897-053110-2ea5fbb561d056c2c7855cb482ade028-2465859557', // Access token from environment
  MX_PUBLIC_KEY: process.env.MP_MX_PUBLIC_KEY || 'TEST-f0fe8e15-aed0-4b3c-ac0f-35269b1793f3',
  MX_ACCESS_TOKEN: process.env.MP_MX_ACCESS_TOKEN || 'TEST-7843631683060897-053110-2ea5fbb561d056c2c7855cb482ade028-2465859557', // Access token from environment
};

// Log configuration on startup
console.log('Configuration loaded:');
console.log(`- Payments enabled: ${PAYMENT_CONFIG.ENABLED}`);