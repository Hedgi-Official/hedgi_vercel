import fetch from 'node-fetch';

const XTB_SERVER_URL = 'http://3.147.6.168';

class XTBService {
    private sessionId: string | null = null;

    async login(userId: string, password: string): Promise<{ status: boolean; streamSessionId: string }> {
        try {
            const response = await fetch(`${XTB_SERVER_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json() as { status: boolean; streamSessionId: string };
            this.sessionId = data.streamSessionId;
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async executeCommand(commandName: string, commandArgs: any): Promise<any> {
        try {
            const response = await fetch(`${XTB_SERVER_URL}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commandName, arguments: commandArgs })
            });

            if (!response.ok) {
                throw new Error('Command execution failed');
            }

            return response.json();
        } catch (error) {
            console.error('Command execution error:', error);
            throw error;
        }
    }

    async placeTrade(params: {
        symbol: string;
        volume: number;
        cmd: number; // 0 for BUY, 1 for SELL
        type: number; // 0 for OPEN, 2 for CLOSE
        price?: number;
        order?: number; // Required when closing trades
        customComment?: string;
    }) {
        try {
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
            return response;
        } catch (error) {
            console.error('Trade error:', error);
            throw error;
        }
    }

    async checkTradeStatus(openedOnly: boolean = true) {
        try {
            const response = await this.executeCommand('getTrades', { openedOnly });
            return response;
        } catch (error) {
            console.error('Status check error:', error);
            throw error;
        }
    }

    async disconnect() {
        this.sessionId = null;
    }
}

// Export a singleton instance
export const xtbService = new XTBService();