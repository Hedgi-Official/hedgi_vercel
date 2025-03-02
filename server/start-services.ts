import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log } from './vite';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const BRIDGE_PORT = process.env.XTB_BRIDGE_PORT || '8000';
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

// Enhanced error logging
function logBridgeError(error: any) {
    log(`Python bridge error: ${error.message}`);
    if (error.stack) {
        log(`Stack trace: ${error.stack}`);
    }
}

// Check if bridge is healthy
async function checkBridgeHealth(): Promise<boolean> {
    try {
        const response = await fetch(`http://localhost:${BRIDGE_PORT}/ping`);
        const data = await response.json();
        return data.message === 'pong';
    } catch (error) {
        return false;
    }
}

// Wait for bridge to be ready
async function waitForBridge(retries = MAX_RETRIES): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
        log(`Checking Python bridge health (attempt ${i + 1}/${retries})...`);
        const isHealthy = await checkBridgeHealth();
        if (isHealthy) {
            log('Python bridge is healthy');
            return true;
        }
        if (i < retries - 1) {
            log(`Bridge not ready, waiting ${RETRY_DELAY}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
    return false;
}

// Verify environment variables
function verifyEnvironment(): boolean {
    const requiredVars = ['XTB_USER_ID', 'XTB_PASSWORD'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        log(`Missing required environment variables: ${missing.join(', ')}`);
        return false;
    }
    return true;
}

// Start Python FastAPI bridge
log('Starting Python bridge service...');

if (!verifyEnvironment()) {
    throw new Error('Required environment variables are missing');
}

const pythonBridge = spawn('python3', [
    join(__dirname, 'services/xtb_bridge.py')
], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: {
        ...process.env,
        XTB_BRIDGE_PORT: BRIDGE_PORT,
        PYTHONUNBUFFERED: '1',  // Ensure Python output isn't buffered
        XTB_USER_ID: process.env.XTB_USER_ID || '',
        XTB_PASSWORD: process.env.XTB_PASSWORD || ''
    }
});

// Enhance process error handling
pythonBridge.on('error', (error) => {
    logBridgeError(error);
    log('Failed to start Python bridge process');
    process.exit(1);
});

pythonBridge.on('exit', (code, signal) => {
    if (code !== 0) {
        log(`Python bridge exited with code ${code} and signal ${signal}`);
        process.exit(1);
    }
});

// Wait for bridge to be healthy before completing startup
waitForBridge().then(isHealthy => {
    if (!isHealthy) {
        log('Failed to verify Python bridge health');
        process.exit(1);
    }
}).catch(error => {
    logBridgeError(error);
    process.exit(1);
});

process.on('SIGINT', () => {
    pythonBridge.kill();
    process.exit();
});

// Export the process for cleanup
export const bridgeProcess = pythonBridge;