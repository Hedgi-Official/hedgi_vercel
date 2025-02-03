import asyncio
import websockets
import json
import logging
import os
from datetime import datetime
import requests
from time import sleep

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
        self.connected = False
        self.symbol = "USDBRL"
        self.clients = set()
        self.api_url = "https://pricefeed.fbs.com/prices"
        self.initialize_connection()

    def initialize_connection(self):
        try:
            # Test connection by making a request
            response = requests.get(f"{self.api_url}?pairs={self.symbol}")
            logger.info(f"FBS API response status: {response.status_code}")
            logger.info(f"FBS API response: {response.text}")

            if response.status_code == 200:
                self.connected = True
                logger.info("Successfully connected to FBS price feed")
            else:
                logger.error(f"Failed to connect to FBS: {response.status_code}")
                self.connected = False
        except Exception as e:
            logger.error(f"Error connecting to FBS: {e}")
            self.connected = False

    async def get_rate(self):
        if not self.connected:
            try:
                self.initialize_connection()
            except Exception as e:
                logger.error(f"Failed to reconnect to FBS: {e}")
                return None

        try:
            response = requests.get(f"{self.api_url}?pairs={self.symbol}")
            logger.debug(f"Rate response: {response.status_code} - {response.text}")

            if response.status_code != 200:
                logger.error(f"Failed to get rates: {response.status_code}")
                return None

            data = response.json()
            if not data or self.symbol not in data:
                logger.error(f"Invalid response format: {data}")
                return None

            rate_data = {
                "symbol": self.symbol,
                "bid": round(float(data[self.symbol]['bid']), 4),
                "ask": round(float(data[self.symbol]['ask']), 4),
                "time": datetime.now().isoformat(),
            }
            logger.debug(f"Processed rate data: {rate_data}")
            return rate_data

        except Exception as e:
            logger.error(f"Error getting rates: {e}")
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
            logger.info(f"Starting WebSocket server on {host}:{port}")
            async def handler(websocket):
                await self.register(websocket)

            async with websockets.serve(handler, host, port):
                logger.info(f"FBS WebSocket server started on ws://{host}:{port}")
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