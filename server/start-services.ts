
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Constants
const BRIDGE_PORT = 8003;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 2000; // 2 seconds

// Store service processes
let xtbBridgeProcess: ChildProcess | null = null;

// Helper function to check if a port is in use
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        tester.once('close', () => resolve(false));
        tester.close();
      })
      .listen(port, '0.0.0.0');
  });
}

export async function startPythonServices() {
  console.log('[Services] Starting Python services...');
  
  try {
    // Ensure we have the necessary Python files
    await ensurePythonFiles();
    
    // Start XTB bridge
    await startXTBBridge();
    
    console.log('[Services] All Python services started');
  } catch (error) {
    console.error('[Services] Failed to start Python services:', error);
    throw error;
  }
}

async function ensurePythonFiles() {
  const sourceDir = path.join(__dirname, 'services');
  const requiredFiles = ['XTBTrader.py', 'xtb_bridge.py', 'xAPIConnector.py'];
  
  for (const file of requiredFiles) {
    const filePath = path.join(sourceDir, file);
    try {
      await fs.access(filePath);
      console.log(`[Services] Found ${file}`);
    } catch (error) {
      console.error(`[Services] Error: ${file} not found in ${sourceDir}`);
      throw new Error(`Required Python file ${file} not found`);
    }
  }
}

async function startXTBBridge() {
  // Check if the port is already in use
  const portInUse = await isPortInUse(BRIDGE_PORT);
  
  if (portInUse) {
    console.log(`[Services] Port ${BRIDGE_PORT} is already in use. XTB bridge may already be running.`);
    return;
  }
  
  console.log('[Services] Starting XTB bridge service...');
  
  // Define the script path
  const scriptPath = path.join(__dirname, 'services', 'xtb_bridge.py');
  
  // Start the process
  xtbBridgeProcess = spawn('python', [scriptPath], {
    stdio: 'pipe',
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });
  
  // Handle output
  xtbBridgeProcess.stdout?.on('data', (data) => {
    console.log(`[XTB Bridge] ${data.toString().trim()}`);
  });
  
  xtbBridgeProcess.stderr?.on('data', (data) => {
    console.error(`[XTB Bridge ERROR] ${data.toString().trim()}`);
  });
  
  // Handle process exit
  xtbBridgeProcess.on('exit', (code, signal) => {
    console.log(`[Services] XTB bridge exited with code ${code} and signal ${signal}`);
    xtbBridgeProcess = null;
  });
  
  // Wait for the service to be ready
  await waitForServiceReady(`http://localhost:${BRIDGE_PORT}`, MAX_RETRIES);
  
  console.log('[Services] XTB bridge service started and ready');
}

async function waitForServiceReady(url: string, maxRetries: number): Promise<void> {
  console.log(`[Services] Waiting for service at ${url} to be ready...`);
  
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`[Services] Service status check (attempt ${retry + 1}/${maxRetries}):`, data);
      
      if (response.ok) {
        console.log('[Services] Service is responding, considering it ready');
        return;
      }
    } catch (error) {
      console.log(`[Services] Service not ready yet (attempt ${retry + 1}/${maxRetries})`);
    }
    
    // Wait before next retry
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
  }
  
  throw new Error(`Service at ${url} is not available after ${maxRetries} retries`);
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('[Services] Shutting down Python services...');
  
  if (xtbBridgeProcess) {
    xtbBridgeProcess.kill();
    console.log('[Services] XTB bridge service stopped');
  }
  
  process.exit(0);
});
