import asyncio
import websockets
import json
import logging
from datetime import datetime
import os
import time
import random

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MT5Service:
    def __init__(self):
        self.connected = True  # Always connected in mock mode
        self.symbol = "USDBRL"
        self.clients = set()
        self.base_rate = 4.95  # Base rate for USDBRL
        logger.info("MT5Service initialized")

    async def get_rate(self):
        try:
            # Simulate small random fluctuations around the base rate
            variation = (random.random() - 0.5) * 0.02  # ±1% variation
            current_rate = self.base_rate + (self.base_rate * variation)

            rate_data = {
                "symbol": self.symbol,
                "bid": float(current_rate - 0.001),  # Simulate bid-ask spread
                "ask": float(current_rate + 0.001),
                "time": datetime.now().isoformat(),
            }
            return rate_data
        except Exception as e:
            logger.error(f"Error generating rate: {e}")
            return None

    async def broadcast_rates(self):
        while True:
            try:
                if self.clients:
                    rate = await self.get_rate()
                    if rate:
                        message = json.dumps(rate)
                        logger.debug(f"Broadcasting rate: {message}")

                        websocket_tasks = []
                        for client in self.clients:
                            try:
                                websocket_tasks.append(client.send(message))
                            except Exception as e:
                                logger.error(f"Error preparing message for client: {e}")

                        if websocket_tasks:
                            await asyncio.gather(*websocket_tasks, return_exceptions=True)

                await asyncio.sleep(1)  # Update every second
            except Exception as e:
                logger.error(f"Error in broadcast loop: {e}")
                await asyncio.sleep(1)  # Wait before retrying

    async def register(self, websocket):
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        try:
            await websocket.wait_closed()
        finally:
            self.clients.remove(websocket)
            logger.info(f"Client disconnected. Remaining clients: {len(self.clients)}")

    async def start_server(self, host="0.0.0.0", port=6789):
        try:
            async def handler(websocket):
                await self.register(websocket)

            async with websockets.serve(handler, host, port):
                logger.info(f"Mock MT5 WebSocket server started on ws://{host}:{port}")
                await self.broadcast_rates()
        except Exception as e:
            logger.error(f"Error starting WebSocket server: {e}")
            raise

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