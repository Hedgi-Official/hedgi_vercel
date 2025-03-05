import fetch from 'node-fetch';

const XTB_SERVER_URL = 'http://3.147.6.168:5000';
const REQUEST_TIMEOUT = 10000; // 10 seconds

interface XTBResponse {
  status: boolean;
  returnData?: {
    order?: number;
  };
  streamSessionId?: string;
  errorDescr?: string;
}

interface ErrorResponse {
  detail?: string;
  message?: string;
}

class XTBService {
    private sessionId: string | null = null;

    async login(userId: string, password: string) {
        try {
            console.log('[XTBService] Attempting to login to:', XTB_SERVER_URL);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(`${XTB_SERVER_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('[XTBService] Login response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('[XTBService] Login failed with status:', response.status, 'Error:', errorData);
                try {
                    const parsedError = JSON.parse(errorData) as ErrorResponse;
                    throw new Error(parsedError.detail || parsedError.message || `Login failed with status ${response.status}`);
                } catch (e) {
                    throw new Error(`Login failed with status ${response.status}: ${errorData}`);
                }
            }

            const data = await response.json() as XTBResponse;
            console.log('[XTBService] Login response data:', { ...data, streamSessionId: '[REDACTED]' });

            if (!data.status) {
                throw new Error(data.errorDescr || 'Login failed - invalid response status');
            }

            this.sessionId = data.streamSessionId || null;
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('[XTBService] Login request timed out after', REQUEST_TIMEOUT, 'ms');
                throw new Error('Login request timed out');
            }
            console.error('[XTBService] Login error:', error);
            throw error;
        }
    }

    async executeCommand(commandName: string, params: any = {}) {
        try {
            console.log('[XTBService] Executing command:', commandName, 'with params:', params);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(`${XTB_SERVER_URL}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commandName,
                    arguments: params
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('[XTBService] Command response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('[XTBService] Command failed with status:', response.status, 'Error:', errorData);
                try {
                    const parsedError = JSON.parse(errorData) as ErrorResponse;
                    throw new Error(parsedError.detail || parsedError.message || `Command failed with status ${response.status}`);
                } catch (e) {
                    throw new Error(`Command failed with status ${response.status}: ${errorData}`);
                }
            }

            const data = await response.json() as XTBResponse;
            console.log('[XTBService] Command response data:', data);

            if (!data.status) {
                throw new Error(data.errorDescr || 'Command execution failed - invalid response status');
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('[XTBService] Command request timed out after', REQUEST_TIMEOUT, 'ms');
                throw new Error(`Command ${commandName} timed out`);
            }
            console.error('[XTBService] Command execution error:', error);
            throw error;
        }
    }

    async placeTrade(params: {
        symbol: string;
        volume: number;
        command: number; // 0 for BUY, 1 for SELL
        orderType: number; // 0 for OPEN, 2 for CLOSE
        order?: number; // Required when closing trades
    }) {
        try {
            console.log('[XTBService] Placing trade with params:', params);

            const tradeTransInfo = {
                cmd: params.command,
                symbol: params.symbol,
                volume: params.volume,
                type: params.orderType,
                price: 0.0, // Market price
                order: params.order || 0
            };

            return await this.executeCommand('tradeTransaction', { tradeTransInfo });
        } catch (error) {
            console.error('[XTBService] Trade error:', error);
            throw error;
        }
    }

    async checkTradeStatus(orderId: number) {
        try {
            console.log('[XTBService] Checking trade status for order:', orderId);
            return await this.executeCommand('getTrades', { openedOnly: true });
        } catch (error) {
            console.error('[XTBService] Status check error:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            console.log('[XTBService] Disconnecting from XTB');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(`${XTB_SERVER_URL}/disconnect`, {
                method: 'POST',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('[XTBService] Disconnect response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('[XTBService] Disconnect failed with status:', response.status, 'Error:', errorData);
                try {
                    const parsedError = JSON.parse(errorData) as ErrorResponse;
                    throw new Error(parsedError.detail || parsedError.message || `Disconnect failed with status ${response.status}`);
                } catch (e) {
                    throw new Error(`Disconnect failed with status ${response.status}: ${errorData}`);
                }
            }

            this.sessionId = null;
            return response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('[XTBService] Disconnect request timed out after', REQUEST_TIMEOUT, 'ms');
                throw new Error('Disconnect request timed out');
            }
            console.error('[XTBService] Disconnect error:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const xtbService = new XTBService();