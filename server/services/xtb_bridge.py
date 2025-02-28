import json
import asyncio
import websockets
from threading import Thread
import logging
import ssl
from typing import Dict, Any, Optional

# Import the XTB API wrapper classes
from APIClient import APIClient, APIStreamClient

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("XTB_Bridge")

class XTBBridge:
    def __init__(self):
        self.client: Optional[APIClient] = None
        self.stream_client: Optional[APIStreamClient] = None
        self.connected = False

    async def connect(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        try:
            logger.info("Attempting to connect to XTB with credentials")

            # Connect to XTB
            self.client = APIClient()
            login_response = self.client.execute({
                "command": "login",
                "arguments": {
                    "userId": credentials["userId"],
                    "password": credentials["password"],
                    "appName": "Hedgi"
                }
            })

            logger.info(f"Login response received: {login_response.get('status')}")

            if not login_response.get('status'):
                logger.error(f"Login failed: {login_response.get('errorDescr', 'Unknown error')}")
                return {
                    "status": False,
                    "error": login_response.get('errorDescr', 'Login failed')
                }

            # Setup streaming connection
            self.stream_client = APIStreamClient(
                ssId=login_response.get('streamSessionId'),
                tickFun=self._handle_tick,
                tradeFun=self._handle_trade,
                tradeStatusFun=self._handle_trade_status
            )

            self.connected = True
            logger.info("Successfully connected to XTB")
            return {
                "status": True,
                "streamSessionId": login_response.get('streamSessionId')
            }
        except Exception as e:
            logger.error(f"Connection error: {str(e)}", exc_info=True)
            return {
                "status": False,
                "error": str(e)
            }

    def _handle_tick(self, msg):
        logger.info(f"Tick received: {msg}")
        # Implement tick handling

    def _handle_trade(self, msg):
        logger.info(f"Trade update received: {msg}")
        # Implement trade handling

    def _handle_trade_status(self, msg):
        logger.info(f"Trade status update received: {msg}")
        # Implement trade status handling

    async def check_trade_status(self, order_number: int) -> Dict[str, Any]:
        if not self.client or not self.connected:
            logger.error("Cannot check trade status: Not connected to XTB")
            return {
                "status": False,
                "error": "Not connected to XTB"
            }

        try:
            logger.info(f"Checking trade status for order: {order_number}")
            response = self.client.execute({
                "command": "tradeTransactionStatus",
                "arguments": {
                    "order": order_number
                }
            })
            logger.info(f"Trade status response: {response}")
            return response
        except Exception as e:
            logger.error(f"Error checking trade status: {str(e)}", exc_info=True)
            return {
                "status": False,
                "error": str(e)
            }

    async def place_trade(self, trade_info: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client or not self.connected:
            logger.error("Cannot place trade: Not connected to XTB")
            return {
                "status": False,
                "error": "Not connected to XTB"
            }

        try:
            logger.info(f"Placing trade with info: {trade_info}")
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {
                    "tradeTransInfo": trade_info
                }
            })
            logger.info(f"Trade placement response: {response}")
            return response
        except Exception as e:
            logger.error(f"Error placing trade: {str(e)}", exc_info=True)
            return {
                "status": False,
                "error": str(e)
            }

    def disconnect(self):
        logger.info("Disconnecting from XTB")
        if self.stream_client:
            self.stream_client.disconnect()
        if self.client:
            self.client.disconnect()
        self.connected = False

async def handle_client(websocket, path):
    bridge = XTBBridge()
    logger.info("New WebSocket client connected")

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                command = data.get('command')
                logger.info(f"Received command: {command}")

                if command == 'connect':
                    response = await bridge.connect(data.get('credentials', {}))
                elif command == 'checkTradeStatus':
                    response = await bridge.check_trade_status(data.get('orderNumber'))
                elif command == 'placeTrade':
                    response = await bridge.place_trade(data.get('tradeInfo', {}))
                else:
                    logger.warning(f"Unknown command received: {command}")
                    response = {
                        "status": False,
                        "error": f"Unknown command: {command}"
                    }

                logger.info(f"Sending response for {command}: {response}")
                await websocket.send(json.dumps(response))
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received: {e}", exc_info=True)
                await websocket.send(json.dumps({
                    "status": False,
                    "error": "Invalid JSON message"
                }))
    except websockets.exceptions.ConnectionClosed:
        logger.info("Client disconnected")
    finally:
        bridge.disconnect()

async def start_server():
    try:
        server = await websockets.serve(
            handle_client,
            "0.0.0.0",  # Listen on all interfaces
            8765  # Port for WebSocket server
        )
        logger.info("XTB Bridge WebSocket server started on port 8765")
        await server.wait_closed()
    except Exception as e:
        logger.error(f"Error starting WebSocket server: {str(e)}", exc_info=True)
        raise

if __name__ == "__main__":
    logger.info("Starting XTB Bridge service")
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        logger.info("XTB Bridge service stopped by user")
    except Exception as e:
        logger.error(f"XTB Bridge service crashed: {str(e)}", exc_info=True)