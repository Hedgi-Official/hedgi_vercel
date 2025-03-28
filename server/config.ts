/**
 * Application configuration
 * This module provides access to configuration variables for the application
 */

import * as dotenv from 'dotenv';

// Load variables from .env file
dotenv.config();

// Payment configuration
export const PAYMENT_CONFIG = {
  // For demonstration purposes, we'll simulate payments instead of using real API
  ENABLED: false, // Set to false to use the simulation flow
  SIMULATE_PAYMENTS: true, // Enable payment simulation
  BR_PUBLIC_KEY: process.env.MP_BR_PUBLIC_KEY || 'TEST-7f59754b-9b20-4cd3-b2da-851ee9a266d7',
  BR_ACCESS_TOKEN: process.env.MP_BR_ACCESS_TOKEN || '', // We don't have a valid access token
  MX_PUBLIC_KEY: process.env.MP_MX_PUBLIC_KEY || 'TEST-7f59754b-9b20-4cd3-b2da-851ee9a266d7',
  MX_ACCESS_TOKEN: process.env.MP_MX_ACCESS_TOKEN || '', // We don't have a valid access token
};

// Log configuration on startup
console.log('Configuration loaded:');
console.log(`- Payments enabled: ${PAYMENT_CONFIG.ENABLED}`);