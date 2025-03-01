import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start Python WebSocket bridge
const pythonBridge = spawn('python', [
    join(__dirname, 'services/xtb_bridge.py')
], {
    stdio: 'inherit'
});

pythonBridge.on('error', (error) => {
    console.error('Failed to start Python bridge:', error);
});

process.on('SIGINT', () => {
    pythonBridge.kill();
    process.exit();
});

// Export the process for cleanup
export const bridgeProcess = pythonBridge;