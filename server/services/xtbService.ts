import fetch from 'node-fetch';

const XTB_SERVER_URL = 'http://3.147.6.168';

class XTBService {
    private sessionId: string | null = null;

    async login(userId: string, password: string): Promise<{ status: boolean; streamSessionId: string }> {
        try {
            console.log('[XTB Service] Attempting login...');
            const response = await fetch(`${XTB_SERVER_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: "login",
                    arguments: {
                        userId,
                        password,
                        appName: "Hedgi"
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json() as { status: boolean; streamSessionId: string };
            this.sessionId = data.streamSessionId;
            console.log('[XTB Service] Login successful');
            return data;
        } catch (error) {
            console.error('[XTB Service] Login error:', error);
            throw error;
        }
    }

    async executeCommand(command: string, args: any = {}): Promise<any> {
        try {
            console.log(`[XTB Service] Executing command: ${command}`, args);
            const response = await fetch(`${XTB_SERVER_URL}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command,
                    arguments: args
                })
            });

            if (!response.ok) {
                throw new Error(`Command ${command} execution failed`);
            }

            const data = await response.json();
            console.log(`[XTB Service] Command ${command} response:`, data);
            return data;
        } catch (error) {
            console.error(`[XTB Service] Command ${command} error:`, error);
            throw error;
        }
    }

    async getSymbol(symbol: string): Promise<any> {
        return this.executeCommand('getSymbol', { symbol });
    }

    async placeTrade(params: {
        symbol: string;
        volume: number;
        cmd: number; // 0 for BUY, 1 for SELL
        type: number; // 0 for OPEN, 2 for CLOSE
        price?: number;
        order?: number; // Required when closing trades
        customComment?: string;
    }): Promise<any> {
        try {
            console.log('[XTB Service] Placing trade:', params);
            const tradeTransInfo = {
                cmd: params.cmd,
                symbol: params.symbol,
                volume: params.volume,
                type: params.type,
                price: params.price || 0.0,
                order: params.order,
                customComment: params.customComment || `Trade ${params.symbol}`,
                expiration: 0,
                offset: 0
            };

            const response = await this.executeCommand('tradeTransaction', { tradeTransInfo });
            console.log('[XTB Service] Trade response:', response);
            return response;
        } catch (error) {
            console.error('[XTB Service] Trade error:', error);
            throw error;
        }
    }

    async checkTradeStatus(orderId: number): Promise<any> {
        return this.executeCommand('tradeTransactionStatus', { order: orderId });
    }

    async disconnect(): Promise<void> {
        if (this.sessionId) {
            await this.executeCommand('logout');
            this.sessionId = null;
        }
    }
}

// Export a singleton instance
export const xtbService = new XTBService();