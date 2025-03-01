
interface XTBResponse {
  success: boolean;
  error?: string;
  status?: string;
  orderId?: number;
  message?: string;
  debug_info?: any;
  returnData?: any;
}

const BRIDGE_URL = 'http://localhost:8003'; // Bridge running on port 8003
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000;

async function checkBridgeHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BRIDGE_URL}/ping`);
    if (!response.ok) return false;
    const data: any = await response.json();
    return data.message === 'pong' && data.ready === true;
  } catch (error) {
    console.error('[Trading Service] Health check failed:', error);
    return false;
  }
}

class TradingService {
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes

  private async ensureLoggedIn(): Promise<void> {
    const currentTime = Date.now();
    if (this.isLoggedIn && (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      return;
    }

    try {
      const bridgeReady = await checkBridgeHealth();
      if (!bridgeReady) {
        throw new Error('Python bridge is not ready');
      }

      await this.login();
    } catch (error) {
      console.error('[Trading Service] Bridge connection failed:', error);
      throw error;
    }
  }

  private async login(): Promise<void> {
    try {
      const response = await fetch(`${BRIDGE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: process.env.XTB_USER_ID || '',
          password: process.env.XTB_PASSWORD || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      console.log('[Trading Service] Successfully logged in');
    } catch (error) {
      console.error('[Trading Service] Login error:', error);
      throw error;
    }
  }

  async openTrade(
    symbol: string,
    price: number,
    volume: number,
    isBuy: boolean,
    sl: number = 0,
    tp: number = 0,
    comment: string = ''
  ) {
    try {
      await this.ensureLoggedIn();
      const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;
      console.log(`[TradingService] Opening trade: ${symbol}, volume: ${adjustedVolume}, isBuy: ${isBuy}`);

      const response = await fetch(`${BRIDGE_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol,
          volume: adjustedVolume,
          command: isBuy ? 0 : 1, // 0 for BUY, 1 for SELL
          orderType: 0, // 0 for OPEN
          sl,
          tp,
          comment
        })
      });

      if (!response.ok) {
        throw new Error(`Trade failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log(`[TradingService] Trade opened successfully, order ID: ${data.orderId}`);
      return data.orderId;
    } catch (error) {
      console.error('[TradingService] Failed to open trade:', error);
      throw error;
    }
  }

  async closeTrade(
    symbol: string,
    orderId: number,
    price: number,
    volume: number,
    isBuy: boolean,
    sl: number = 0,
    tp: number = 0,
    comment: string = ''
  ) {
    try {
      await this.ensureLoggedIn();
      const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;
      console.log(`[TradingService] Closing trade: ${symbol}, order: ${orderId}, volume: ${adjustedVolume}`);

      const response = await fetch(`${BRIDGE_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol,
          volume: adjustedVolume,
          command: isBuy ? 1 : 0, // Opposite of opening command
          orderType: 2, // 2 for CLOSE
          order: orderId,
          sl,
          tp,
          comment
        })
      });

      if (!response.ok) {
        throw new Error(`Close trade failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log(`[TradingService] Trade closed successfully, closing order ID: ${data.orderId}`);
      return data.orderId;
    } catch (error) {
      console.error('[TradingService] Failed to close trade:', error);
      throw error;
    }
  }

  async checkTradeStatus(orderId: number) {
    try {
      await this.ensureLoggedIn();
      console.log(`[TradingService] Checking status for order: ${orderId}`);

      const response = await fetch(`${BRIDGE_URL}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        throw new Error(`Status check failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log(`[TradingService] Trade status received:`, data);
      return data;
    } catch (error) {
      console.error('[TradingService] Failed to check trade status:', error);
      throw error;
    }
  }
  
  get isConnected(): boolean {
    return this.isLoggedIn;
  }
}

// Export as proper named exports
export const tradingService = new TradingService();
export const xtbService = new TradingService();
