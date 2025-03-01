import fetch from 'node-fetch';

const BRIDGE_URL = 'http://localhost:8001';

class XTBService {
    private sessionId: string | null = null;

    async login(userId: string, password: string) {
        try {
            const response = await fetch(`${BRIDGE_URL}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const data = await response.json();
            this.sessionId = data.sessionId;
            return data;
        } catch (error) {
            console.error('Login error:', error);
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
            const response = await fetch(`${BRIDGE_URL}/trade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Trade failed');
            }

            return response.json();
        } catch (error) {
            console.error('Trade error:', error);
            throw error;
        }
    }

    async checkTradeStatus(orderId: number) {
        try {
            const response = await fetch(`${BRIDGE_URL}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Status check failed');
            }

            return response.json();
        } catch (error) {
            console.error('Status check error:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            const response = await fetch(`${BRIDGE_URL}/disconnect`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Disconnect failed');
            }

            this.sessionId = null;
            return response.json();
        } catch (error) {
            console.error('Disconnect error:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const xtbService = new XTBService();