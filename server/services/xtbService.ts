import WebSocket from 'ws';

class XTBService {
    private ws: WebSocket | null = null;
    private connected: boolean = false;

    constructor() {
        this.connect();
    }

    private connect() {
        this.ws = new WebSocket('ws://localhost:8765');

        this.ws.on('open', () => {
            console.log('Connected to XTB Bridge');
            this.connected = true;
        });

        this.ws.on('close', () => {
            console.log('Disconnected from XTB Bridge');
            this.connected = false;
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.connect(), 5000);
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.connected = false;
        });
    }

    private async sendCommand(command: string, data: any): Promise<any> {
        if (!this.ws || !this.connected) {
            throw new Error('WebSocket is not connected');
        }

        return new Promise((resolve, reject) => {
            const messageHandler = (response: WebSocket.Data) => {
                try {
                    const parsedResponse = JSON.parse(response.toString());
                    this.ws!.removeListener('message', messageHandler);
                    if (!parsedResponse.success) {
                        reject(new Error(parsedResponse.error));
                    } else {
                        resolve(parsedResponse);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            this.ws!.on('message', messageHandler);
            this.ws!.send(JSON.stringify({ command, ...data }));
        });
    }

    async login(userId: string, password: string) {
        return this.sendCommand('connect', { userId, password });
    }

    async placeTrade(params: {
        symbol: string;
        volume: number;
        command: number; // 0 for BUY, 1 for SELL
        orderType: number; // 0 for OPEN, 2 for CLOSE
    }) {
        return this.sendCommand('trade', params);
    }

    async checkTradeStatus(orderId: number) {
        return this.sendCommand('status', { orderId });
    }

    async disconnect() {
        return this.sendCommand('disconnect', {});
    }
}

// Export a singleton instance
export const xtbService = new XTBService();
