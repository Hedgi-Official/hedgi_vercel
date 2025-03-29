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
  ENABLED: true, // Force enable payments
  SIMULATE_PAYMENTS: false, // Disable payment simulation
  BR_PUBLIC_KEY: process.env.MP_BR_PUBLIC_KEY || 'TEST-7f59754b-9b20-4cd3-b2da-851ee9a266d7',
  BR_ACCESS_TOKEN: process.env.MP_BR_ACCESS_TOKEN || '', // Access token from environment
  MX_PUBLIC_KEY: process.env.MP_MX_PUBLIC_KEY || 'TEST-7f59754b-9b20-4cd3-b2da-851ee9a266d7',
  MX_ACCESS_TOKEN: process.env.MP_MX_ACCESS_TOKEN || '', // Access token from environment
};

// Log configuration on startup
console.log('Configuration loaded:');
console.log(`- Payments enabled: ${PAYMENT_CONFIG.ENABLED}`);