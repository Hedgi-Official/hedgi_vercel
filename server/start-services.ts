import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log } from './vite';
import fs from 'fs'; // Import fs module for chmod
import Path from 'path'; // Import path module


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
// Start Python bridge service
function startPythonBridge() {
  const port = process.env.XTB_BRIDGE_PORT || "8001";
  const pythonScript = Path.join(__dirname, "services", "xtb_bridge.py");

  try {
    console.log(`Starting Python bridge service on port ${port}...`);
    console.log(`Python script path: ${pythonScript}`);

    // Make sure script is executable
    try {
      fs.chmodSync(pythonScript, 0o755);
    } catch (err) {
      console.warn("Could not set executable permissions:", err);
    }

    // Add attached_assets to PYTHONPATH
    const assetsPath = Path.join(process.cwd(), "attached_assets");
    process.env.PYTHONPATH = process.env.PYTHONPATH 
      ? `${process.env.PYTHONPATH}:${assetsPath}`
      : assetsPath;

    console.log(`Setting PYTHONPATH to include: ${assetsPath}`);

    const pythonProcess = spawn("python", [pythonScript], {
      env: { 
        ...process.env, 
        XTB_BRIDGE_PORT: port,
        PYTHONUNBUFFERED: "1" // Ensure Python output is not buffered
      },
      stdio: "inherit"
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python bridge:", err);
    });

    pythonProcess.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Python bridge exited with code ${code}`);
      }
    });

    console.log("Python bridge service started");

    // Keep track of the process to ensure it doesn't get garbage collected
    global.pythonBridgeProcess = pythonProcess;
  } catch (error) {
    console.error("Error starting Python bridge service:", error);
  }
}

startPythonBridge();


//log('Starting Python bridge service...');
//const pythonBridge = spawn('python3', [
//    join(__dirname, 'services/xtb_bridge.py')
//], {
//    stdio: ['inherit', 'pipe', 'pipe'],
//    env: {
//        ...process.env,
//        XTB_BRIDGE_PORT: '8001',  // Changed to port 8001
//        PYTHONUNBUFFERED: '1',  // Ensure Python output isn't buffered
//        XTB_USER_ID: process.env.XTB_USER_ID || '17535100',
//        XTB_PASSWORD: process.env.XTB_PASSWORD || 'GuiZarHoh2711!'
//    }
//});

//// Capture and log stdout
//pythonBridge.stdout.on('data', (data) => {
//    log(`Python bridge stdout: ${data}`);
//});

//// Capture and log stderr
//pythonBridge.stderr.on('data', (data) => {
//    log(`Python bridge stderr: ${data}`);
//});

//pythonBridge.on('error', (error) => {
//    logBridgeError(error);
//    log('Failed to start Python bridge process');
//});

//pythonBridge.on('exit', (code, signal) => {
//    if (code !== 0) {
//        log(`Python bridge exited with code ${code} and signal ${signal}`);
//        // Attempt to restart the bridge
//        log('Attempting to restart Python bridge...');
//        process.exit(1); // Force Node process to exit, PM2 or similar should restart it
//    }
//});

//process.on('SIGINT', () => {
//    pythonBridge.kill();
//    process.exit();
//});

//// Export the process for cleanup
//export const bridgeProcess = pythonBridge;