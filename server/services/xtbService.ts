import fetch from 'node-fetch';

// Define interfaces for XTB API responses
interface XTBResponse {
  status: boolean;
  returnData?: any;
  errorCode?: string;
  errorDescr?: string;
  streamSessionId?: string;
}

interface XTBLoginResponse extends XTBResponse {
  streamSessionId?: string;
}

interface XTBTradeResponse extends XTBResponse {
  returnData?: {
    order: number;
  };
}

const XTB_SERVER_URL = 'http://3.147.6.168:5000';

class XTBService {
    private sessionId: string | null = null;

    async login(userId: string, password: string): Promise<XTBLoginResponse> {
        try {
            const response = await fetch(`${XTB_SERVER_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json() as XTBLoginResponse;
            this.sessionId = data.streamSessionId || null;
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
    }): Promise<XTBTradeResponse> {
        try {
            // Convert to the correct format for the XTB API
            const tradeTransInfo = {
                cmd: params.command,
                symbol: params.symbol,
                volume: params.volume,
                type: params.orderType,
                price: 0, // Market order
                order: params.order || 0
            };

            const response = await fetch(`${XTB_SERVER_URL}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commandName: 'tradeTransaction',
                    arguments: {
                        tradeTransInfo: tradeTransInfo
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(errorData.detail || 'Trade failed');
            }

            return response.json() as Promise<XTBTradeResponse>;
        } catch (error) {
            console.error('Trade error:', error);
            throw error;
        }
    }

    async checkTradeStatus(orderId: number): Promise<XTBResponse> {
        try {
            const response = await fetch(`${XTB_SERVER_URL}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commandName: 'getTrades',
                    arguments: {
                        openedOnly: true
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(errorData.detail || 'Status check failed');
            }

            const data = await response.json() as XTBResponse;
            
            // Filter the trades to find the specific order
            if (data.status && data.returnData) {
                const trades = data.returnData;
                const targetTrade = trades.find((t: any) => t.order === orderId || t.position === orderId);
                
                if (targetTrade) {
                    return {
                        status: true,
                        returnData: targetTrade
                    };
                }
            }
            
            return {
                status: true,
                returnData: null
            };
        } catch (error) {
            console.error('Status check error:', error);
            throw error;
        }
    }

    async disconnect(): Promise<XTBResponse> {
        try {
            const response = await fetch(`${XTB_SERVER_URL}/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(errorData.detail || 'Disconnect failed');
            }

            this.sessionId = null;
            return response.json() as Promise<XTBResponse>;
        } catch (error) {
            console.error('Disconnect error:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const xtbService = new XTBService();