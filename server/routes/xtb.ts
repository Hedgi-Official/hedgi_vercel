import { Router } from 'express';
import fetch from 'node-fetch';
import AbortController from 'abort-controller';
import { tradingService } from '../services/trading';
import dns from 'dns';
import { promisify } from 'util';

const router = Router();
const XTB_SERVER_URL = process.env.XTB_SERVER_URL || 'http://3.147.6.168:5000';
const API_TIMEOUT = parseInt(process.env.XTB_API_TIMEOUT || '15000', 10);

const initializeXTB = async () => {
  try {
    await tradingService.connect();
    console.log('[XTB Backend] Connected successfully');
    return true;
  } catch (error) {
    console.error('[XTB Backend] Connection error:', error);
    return false;
  }
};

// Initialize connection when the server starts
initializeXTB();

router.post('/api/xtb/hedge', async (req, res) => {
  try {
    if (!tradingService.isConnected) {
      await initializeXTB();
    }

    const hedgeResult = await tradingService.executeHedge(req.body);
    res.json(hedgeResult);
  } catch (error) {
    console.error('[XTB Backend] Error executing hedge:', error);
    res.status(500).json({ error: 'Failed to execute hedge' });
  }
});

// Real data only rates endpoint
router.get('/api/xtb/rates', async (req, res) => {
  try {
    // If not connected, attempt to connect
    if (!tradingService.isConnected) {
      await initializeXTB();
    }

    const symbols = ['USDBRL', 'EURUSD', 'USDMXN'];
    const rates = [];

    for (const symbol of symbols) {
      try {
        const symbolResponse = await tradingService.getSymbolData(symbol);
        console.log(`[XTB Backend] Symbol data for ${symbol}:`, symbolResponse);

        if (!symbolResponse.status || !symbolResponse.returnData) {
          console.error(`[XTB Backend] Failed to get data for ${symbol}`);
          continue;
        }

        // Extract the relevant data from the response
        const data = symbolResponse.returnData;

        rates.push({
          symbol: data.symbol,
          bid: data.bid,
          ask: data.ask,
          timestamp: Date.now(),
          swapLong: data.swapLong || 0,
          swapShort: data.swapShort || 0
        });
      } catch (symbolError) {
        console.error(`[XTB Backend] Error getting data for ${symbol}:`, symbolError);
      }
    }

    if (rates.length > 0) {
      res.json(rates);
    } else {
      throw new Error('Failed to get exchange rates from XTB API');
    }
  } catch (error) {
    console.error('[XTB Backend] Error getting rates:', error);
    res.status(500).json({ error: 'Failed to get exchange rates' });
  }
});

// Get detailed symbol information
router.get('/api/xtb/symbol/:symbolName', async (req, res) => {
  try {
    if (!tradingService.isConnected) {
      await initializeXTB();
    }

    const symbolName = req.params.symbolName;
    const symbolData = await tradingService.getSymbolData(symbolName);

    if (!symbolData.status) {
      return res.status(404).json({ error: `Symbol ${symbolName} not found` });
    }

    res.json(symbolData.returnData);
  } catch (error) {
    console.error(`[XTB Backend] Error getting symbol data for ${req.params.symbolName}:`, error);
    res.status(500).json({ error: 'Failed to get symbol data' });
  }
});

// Health check endpoint
router.get('/api/xtb/health', async (req, res) => {
  const isConnected = tradingService.isConnected;

  res.json({
    service: 'XTB API',
    status: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});


// Helper to perform a diagnostic API test
async function testApiEndpoint(endpoint: string, method: string = 'GET', body: any = null): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  const startTime = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Diagnostic-Request': 'true',
      'X-Request-Time': startTime.toString()
    };

    // Handle both absolute URLs and relative paths
    const isAbsoluteUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const url = isAbsoluteUrl ? endpoint : `${XTB_SERVER_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    // Get response basics
    const result = {
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      duration,
      url,
      headers: Object.fromEntries(response.headers.entries()),
      endpoint,
      method
    };

    // Try to get the body
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const jsonData = await response.json();
        return { ...result, body: jsonData };
      } else {
        const textData = await response.text();
        return { ...result, body: textData, isText: true };
      }
    } catch (error) {
      return {
        ...result,
        bodyError: error instanceof Error ? error.message : String(error)
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
      endpoint,
      method
    };
  }
}

// Import dns for DNS lookup
const dnsLookup = promisify(dns.lookup);

// API Diagnostics endpoint to test the full API connectivity
router.get('/api/xtb/diagnostics', async (req, res) => {
  try {
    console.log('[XTB Diagnostics] Running full API diagnostics...');

    // Collect system information
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: {
        XTB_SERVER_URL: process.env.XTB_SERVER_URL || 'default (http://3.147.6.168:5000)',
        API_TIMEOUT: process.env.XTB_API_TIMEOUT || 'default (15000ms)',
        FALLBACK_ENABLED: process.env.XTB_FALLBACK_ENABLED || 'default (false)'
      }
    };

    // Run a series of tests
    const tests = [];

    // Test 1: Basic health check
    tests.push({
      name: 'basic_health',
      result: await testApiEndpoint('/health')
    });

    // Test 2: Login test with sample credentials
    const loginPayload = {
      userId: 17535100,
      password: 'xoh74681'
    };

    tests.push({
      name: 'login_test',
      result: await testApiEndpoint('/login', 'POST', loginPayload)
    });

    // Test 3: Symbol data for USDBRL
    const commandPayload = {
      commandName: 'getSymbol',
      arguments: {
        symbol: 'USDBRL'
      }
    };

    tests.push({
      name: 'symbol_data',
      result: await testApiEndpoint('/command', 'POST', commandPayload)
    });

    // Test 4: TCP port connectivity check
    let portCheck;
    try {
      const { hostname, port } = new URL(XTB_SERVER_URL);
      const portNumber = port || '5000';

      // This is a simple way to check port connectivity without adding a new package
      const portCheckController = new AbortController();
      const portCheckTimeoutId = setTimeout(() => portCheckController.abort(), 5000);

      // Try a basic fetch to see if we can connect to the port
      const portCheckStartTime = Date.now();
      const portCheckResult = await fetch(`${XTB_SERVER_URL}/health`, {
        method: 'HEAD',
        signal: portCheckController.signal
      }).catch(err => ({ error: err.message }));

      clearTimeout(portCheckTimeoutId);
      const portCheckDuration = Date.now() - portCheckStartTime;

      portCheck = {
        host: hostname,
        port: portNumber,
        reachable: !('error' in portCheckResult),
        duration: portCheckDuration,
        error: 'error' in portCheckResult ? portCheckResult.error : undefined
      };
    } catch (err) {
      portCheck = {
        error: err instanceof Error ? err.message : String(err),
        reachable: false
      };
    }
    tests.push({
      name: 'port_connectivity',
      result: portCheck
    });

    // Test 5: Check outbound internet connectivity to a reliable service
    tests.push({
      name: 'internet_connectivity',
      result: await testApiEndpoint('https://httpbin.org/get', 'GET')
        .catch(err => ({ error: err.message, success: false }))
    });

    // Compile and return results
    const results = {
      timestamp: new Date().toISOString(),
      systemInfo,
      serverUrl: XTB_SERVER_URL,
      tests,
      summary: {
        totalTests: tests.length,
        successfulTests: tests.filter(t => t.result.success).length,
        issues: tests.filter(t => !t.result.success).map(t => ({
          test: t.name,
          error: t.result.error || 'Test failed'
        }))
      }
    };

    console.log(`[XTB Diagnostics] Completed with ${results.summary.successfulTests}/${results.summary.totalTests} successful tests`);
    res.json(results);
  } catch (error) {
    console.error('[XTB Diagnostics] Error running diagnostics:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Import dns for DNS lookup
//import dns from 'dns';
//import { promisify } from 'util';
//const dnsLookup = promisify(dns.lookup);

// Health check endpoint for the Flask server with detailed diagnostics
router.get('/api/xtb/health_old', async (req, res) => {
  try {
    console.log('[XTB Health] Checking Flask server health...');
    const diagnostics: Record<string, any> = {
      checks: [],
      serverUrl: XTB_SERVER_URL,
      timestamp: new Date().toISOString()
    };

    // Parse the URL to extract hostname
    let hostname: string;
    try {
      const url = new URL(XTB_SERVER_URL);
      hostname = url.hostname;
      diagnostics.checks.push({
        name: 'parse_url',
        success: true,
        hostname,
        protocol: url.protocol,
        port: url.port || (url.protocol === 'https:' ? '443' : '80')
      });
    } catch (err) {
      diagnostics.checks.push({
        name: 'parse_url',
        success: false,
        error: (err instanceof Error) ? err.message : String(err)
      });
      throw new Error('Invalid server URL format');
    }

    // Check DNS resolution
    try {
      console.log(`[XTB Health] Performing DNS lookup for ${hostname}...`);
      const dnsResult = await dnsLookup(hostname);
      diagnostics.checks.push({
        name: 'dns_lookup',
        success: true,
        ip: dnsResult.address,
        family: dnsResult.family === 4 ? 'IPv4' : 'IPv6'
      });
    } catch (err) {
      console.error(`[XTB Health] DNS lookup failed for ${hostname}:`, err);
      diagnostics.checks.push({
        name: 'dns_lookup',
        success: false,
        error: (err instanceof Error) ? err.message : String(err)
      });
    }

    // Attempt connection with timeout
    try {
      console.log(`[XTB Health] Testing connectivity to ${XTB_SERVER_URL}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const startTime = Date.now();
      const response = await fetch(`${XTB_SERVER_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          // Add request ID for tracing
          'X-Request-ID': `health-check-${Date.now()}`
        }
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[XTB Health] Server returned ${response.status}: ${errorText}`);
        diagnostics.checks.push({
          name: 'connectivity',
          success: false,
          statusCode: response.status,
          responseTime: duration,
          error: errorText
        });
        throw new Error(`Flask server returned error status: ${response.status}`);
      }

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      console.log(`[XTB Health] Server is healthy, response time: ${duration}ms`);
      diagnostics.checks.push({
        name: 'connectivity',
        success: true,
        statusCode: response.status,
        responseTime: duration,
        contentType: contentType || 'unknown'
      });

      // All checks passed, return success
      return res.json({
        status: 'ok',
        message: 'Flask server is healthy',
        responseTime: duration,
        diagnostics
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[XTB Health] Connection failed:`, errorMessage);

      // Check if it's an AbortError (timeout)
      const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');

      // If we didn't already add a connectivity check (in case of non-OK responses)
      if (!diagnostics.checks.some((check: any) => check.name === 'connectivity')) {
        diagnostics.checks.push({
          name: 'connectivity',
          success: false,
          error: errorMessage,
          isTimeout
        });
      }

      // Return detailed diagnostic info even on failure
      return res.status(503).json({
        status: 'error',
        message: isTimeout
          ? 'Flask server connection timed out'
          : 'Flask server is unreachable',
        error: errorMessage,
        diagnostics
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[XTB Health] Error checking server health:', errorMessage);
    res.status(500).json({
      status: 'error',
      message: 'Error checking Flask server health',
      error: errorMessage
    });
  }
});


export default router;