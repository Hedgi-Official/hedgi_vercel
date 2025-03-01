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

// Get Python executable path (try python3 first, then python)
function getPythonExecutable() {
    try {
        const python3Check = spawn('which', ['python3']);
        let output = '';
        python3Check.stdout.on('data', (data) => {
            output += data.toString();
        });

        return new Promise((resolve) => {
            python3Check.on('close', (code) => {
                if (code === 0 && output.trim()) {
                    resolve('python3');
                } else {
                    log('python3 not found, trying python...');
                    resolve('python');
                }
            });
        });
    } catch (error) {
        log('Error checking python3, defaulting to python');
        return Promise.resolve('python');
    }
}

// Start Python FastAPI bridge with improved error handling
log('Starting Python bridge service...');

// Use an async IIFE to allow await
(async () => {
    const pythonCommand = await getPythonExecutable();
    log(`Using Python executable: ${pythonCommand}`);

    const bridgePath = join(__dirname, 'services/xtb_bridge.py');
    log(`Bridge script path: ${bridgePath}`);

    // Check if the bridge file exists
    try {
        const fs = await import('fs');
        if (!fs.existsSync(bridgePath)) {
            log(`ERROR: Bridge file not found at ${bridgePath}`);
            // List files in the directory to help debug
            const dir = join(__dirname, 'services');
            log(`Contents of ${dir}:`);
            if (fs.existsSync(dir)) {
                fs.readdirSync(dir).forEach(file => {
                    log(`- ${file}`);
                });
            } else {
                log(`Services directory does not exist: ${dir}`);
            }
        }
    } catch (error) {
        log(`Error checking bridge file: ${error}`);
    }

    const pythonBridge = spawn(pythonCommand, [bridgePath], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: {
            ...process.env,
            XTB_BRIDGE_PORT: '8003',  // Changed to port 8003
            PYTHONUNBUFFERED: '1',  // Ensure Python output isn't buffered
            PYTHONIOENCODING: 'utf-8',  // Set encoding explicitly
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

    // More sophisticated exit handling with automatic restart
    let restartAttempts = 0;
    const maxRestartAttempts = 3;

    pythonBridge.on('exit', (code, signal) => {
        if (code !== 0) {
            log(`Python bridge exited with code ${code} and signal ${signal}`);

            // Attempt to restart the bridge a few times before giving up
            if (restartAttempts < maxRestartAttempts) {
                restartAttempts++;
                const delay = restartAttempts * 2000; // Progressive backoff
                log(`Attempting to restart Python bridge in ${delay/1000} seconds... (Attempt ${restartAttempts}/${maxRestartAttempts})`);

                setTimeout(() => {
                    log('Restarting Python bridge...');
                    const newBridge = spawn(pythonCommand, [bridgePath], {
                        stdio: ['inherit', 'pipe', 'pipe'],
                        env: pythonBridge.spawnargs[2].env
                    });

                    // Transfer all event handlers
                    newBridge.stdout.on('data', data => log(`Python bridge stdout: ${data}`));
                    newBridge.stderr.on('data', data => log(`Python bridge stderr: ${data}`));
                    newBridge.on('error', logBridgeError);
                    newBridge.on('exit', pythonBridge.listeners('exit')[0]);

                    // Replace the global reference
                    global.bridgeProcess = newBridge;
                }, delay);
            } else {
                log(`Maximum restart attempts (${maxRestartAttempts}) reached. Giving up.`);
                log('You may need to restart the application manually.');
            }
        }
    });

    // Make the bridge available globally
    global.bridgeProcess = pythonBridge;
})().catch(error => {
    log(`Error starting Python bridge: ${error}`);
});

process.on('SIGINT', () => {
    if (global.bridgeProcess) {
        global.bridgeProcess.kill();
    }
    process.exit();
});

// Export the process for cleanup
export const bridgeProcess = global.bridgeProcess;