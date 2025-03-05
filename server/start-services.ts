import { log } from './vite';

// We're now using an external Flask server at http://3.147.6.168 instead of a local Python bridge
log('Using external XTB trading server at http://3.147.6.168');

// Dummy export to avoid breaking existing imports
export const bridgeProcess = null;