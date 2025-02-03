import asyncio
import websockets
import json
import logging
from datetime import datetime
import os
import time
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MT5Service:
    def __init__(self):
        self.connected = True  # Always connected in mock mode
        self.symbol = "USDBRL"
        self.clients = set()
        self.base_rate = 4.95  # Base rate for USDBRL

    async def get_rate(self):
        # Simulate small random fluctuations around the base rate
        variation = (random.random() - 0.5) * 0.02  # ±1% variation
        current_rate = self.base_rate + (self.base_rate * variation)

        return {
            "symbol": self.symbol,
            "bid": float(current_rate - 0.001),  # Simulate bid-ask spread
            "ask": float(current_rate + 0.001),
            "time": datetime.now().isoformat(),
        }

    async def broadcast_rates(self):
        while True:
            if self.clients:
                rate = await self.get_rate()
                if rate:
                    message = json.dumps(rate)
                    websocket_tasks = [
                        asyncio.create_task(client.send(message))
                        for client in self.clients
                    ]
                    await asyncio.gather(*websocket_tasks, return_exceptions=True)
            await asyncio.sleep(1)  # Update every second

    async def register(self, websocket):
        self.clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            self.clients.remove(websocket)

    async def start_server(self, host="0.0.0.0", port=6789):
        async def handler(websocket):
            await self.register(websocket)

        async with websockets.serve(handler, host, port):
            logger.info(f"Mock MT5 WebSocket server started on ws://{host}:{port}")
            await self.broadcast_rates()

def main():
    try:
        service = MT5Service()
        asyncio.run(service.start_server())
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.error(f"Service error: {e}")

if __name__ == "__main__":
    main()