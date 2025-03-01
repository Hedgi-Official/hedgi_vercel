import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log } from './vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced error logging
function logBridgeError(error: any) {
    log(`Python bridge error: ${error.message}`);
    if (error.stack) {
        log(`Stack trace: ${error.stack}`);
    }
}

// Start Python FastAPI bridge
log('Starting Python bridge service...');
const pythonBridge = spawn('python3', [
    join(__dirname, 'services/xtb_bridge.py')
], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: {
        ...process.env,
        XTB_BRIDGE_PORT: '8001',  // Changed to port 8001
        PYTHONUNBUFFERED: '1',  // Ensure Python output isn't buffered
        XTB_USER_ID: process.env.XTB_USER_ID || '17535100',
        XTB_PASSWORD: process.env.XTB_PASSWORD || 'GuiZarHoh2711!'
    }
});

// Capture and log stdout
pythonBridge.stdout.on('data', (data) => {
    log(`Python bridge stdout: ${data}`);
});

// Capture and log stderr
pythonBridge.stderr.on('data', (data) => {
    log(`Python bridge stderr: ${data}`);
});

pythonBridge.on('error', (error) => {
    logBridgeError(error);
    log('Failed to start Python bridge process');
});

pythonBridge.on('exit', (code, signal) => {
    if (code !== 0) {
        log(`Python bridge exited with code ${code} and signal ${signal}`);
        // Attempt to restart the bridge
        log('Attempting to restart Python bridge...');
        process.exit(1); // Force Node process to exit, PM2 or similar should restart it
    }
});

process.on('SIGINT', () => {
    pythonBridge.kill();
    process.exit();
});

// Export the process for cleanup
export const bridgeProcess = pythonBridge;