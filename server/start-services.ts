import { log } from './vite';

// XTB API service initialization
log('Initializing XTB API service connection...');

// The Flask server is now handling all XTB API operations
// No need to start a local Python bridge

// This file is kept for compatibility with existing import statements
// but all Python bridge functionality has been replaced with direct HTTP
// calls to the Flask server at http://3.147.6.168

process.on('SIGINT', () => {
    process.exit();
});

// Stub for compatibility
export const bridgeProcess = null;