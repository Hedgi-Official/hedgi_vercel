import MetaTrader5 as mt5
import asyncio
import websockets
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MT5Service:
    def __init__(self):
        self.connected = False
        self.symbol = "USDBRL"
        self.clients = set()
        
    async def connect(self):
        if not mt5.initialize():
            logger.error("MT5 initialization failed")
            return False
            
        logger.info(f"MetaTrader5 package version: {mt5.__version__}")
        logger.info(f"Terminal info: {mt5.terminal_info()}")
        logger.info(f"Connected to account: {mt5.account_info()}")
        
        self.connected = True
        return True
        
    async def get_rate(self):
        if not self.connected:
            return None
            
        try:
            rate = mt5.symbol_info_tick(self.symbol)
            if rate is None:
                return None
                
            return {
                "symbol": self.symbol,
                "bid": float(rate.bid),
                "ask": float(rate.ask),
                "time": datetime.fromtimestamp(rate.time).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error getting rate: {e}")
            return None
            
    async def broadcast_rates(self):
        while True:
            if self.clients:
                rate = await self.get_rate()
                if rate:
                    message = json.dumps(rate)
                    await asyncio.gather(
                        *[client.send(message) for client in self.clients]
                    )
            await asyncio.sleep(1)  # Update every second
            
    async def register(self, websocket):
        self.clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            self.clients.remove(websocket)
            
    async def start_server(self, host="0.0.0.0", port=6789):
        if not await self.connect():
            logger.error("Failed to connect to MT5")
            return
            
        async def handler(websocket):
            await self.register(websocket)
            
        async with websockets.serve(handler, host, port):
            logger.info(f"WebSocket server started on ws://{host}:{port}")
            await self.broadcast_rates()
            
def main():
    service = MT5Service()
    asyncio.run(service.start_server())
    
if __name__ == "__main__":
    main()
