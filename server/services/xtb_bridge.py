import json
import asyncio
import websockets
from threading import Thread
import logging
import ssl
from typing import Dict, Any, Optional
import time

# Import the XTB API wrapper classes
from APIClient import APIClient, APIStreamClient, TransactionSide, TransactionType, loginCommand

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
        self.ssid = None

    async def connect(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        try:
            logger.info("Attempting to connect to XTB")
            self.client = APIClient()

            login_response = self.client.execute(loginCommand(
                userId=credentials.get("userId", "17474971"),
                password=credentials.get("password", "xoh74681"),
                appName="Hedgi"
            ))

            if login_response.get("status"):
                logger.info("✅ Logged in successfully!")
                self.ssid = login_response.get("streamSessionId")
                logger.info("🔗 Stream session ID: %s", self.ssid)
                self.connected = True
                return {
                    "status": True,
                    "streamSessionId": self.ssid
                }
            else:
                logger.error("❌ Login failed: %s", login_response)
                return {
                    "status": False,
                    "error": login_response.get("errorDescr", "Login failed")
                }
        except Exception as e:
            logger.error("❌ Connection error: %s", str(e), exc_info=True)
            return {
                "status": False,
                "error": str(e)
            }

    async def check_trade_status(self, order_number: int) -> Dict[str, Any]:
        if not self.client or not self.connected:
            logger.error("Cannot check trade status: Not connected to XTB")
            return {
                "status": False,
                "error": "Not connected to XTB"
            }

        try:
            logger.info("📊 Checking trade status for order: %s", order_number)
            response = self.client.execute({
                "command": "tradeTransactionStatus",
                "arguments": {"order": order_number}
            })

            logger.info("Trade status response: %s", response)

            if response.get("status"):
                return {
                    "status": True,
                    "returnData": {
                        "order": order_number,
                        "requestStatus": response["returnData"].get("requestStatus"),
                        "message": response["returnData"].get("message"),
                        "customComment": response["returnData"].get("customComment"),
                        "price": response["returnData"].get("price")
                    }
                }
            return response

        except Exception as e:
            logger.error("❌ Error checking trade status: %s", str(e), exc_info=True)
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
            trade_trans_info = {
                "cmd": TransactionSide.BUY if trade_info.get("isBuy", True) else TransactionSide.SELL,
                "customComment": trade_info.get("customComment", "Hedgi trade"),
                "expiration": trade_info.get("expiration", 0),
                "order": 0,  # For new orders, this is set to 0
                "price": float(trade_info.get("price", 0)),
                "sl": float(trade_info.get("sl", 0)),
                "symbol": trade_info.get("symbol", ""),
                "tp": float(trade_info.get("tp", 0)),
                "type": TransactionType.ORDER_OPEN,
                "volume": float(trade_info.get("volume", 0))
            }

            logger.info("Placing trade with info: %s", trade_trans_info)
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {"tradeTransInfo": trade_trans_info}
            })

            if response.get("status"):
                order_number = response["returnData"]["order"]
                logger.info("✅ Trade placed successfully, order number: %s", order_number)
                return {
                    "status": True,
                    "returnData": {
                        "order": order_number,
                        "status": "Accepted",
                        "customComment": trade_trans_info["customComment"]
                    }
                }
            else:
                logger.error("❌ Trade placement failed: %s", response)
                return response

        except Exception as e:
            logger.error("❌ Error placing trade: %s", str(e), exc_info=True)
            return {
                "status": False,
                "error": str(e)
            }

    async def close_trade(self, close_info: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client or not self.connected:
            logger.error("Cannot close trade: Not connected to XTB")
            return {
                "status": False,
                "error": "Not connected to XTB"
            }

        try:
            order = close_info.get("order")
            symbol = close_info.get("symbol")
            volume = float(close_info.get("volume", 0))
            price = float(close_info.get("price", 0))

            close_trans_info = {
                "cmd": TransactionSide.BUY,  # As per tutorial, use BUY to close a BUY trade
                "customComment": "Close trade via Hedgi",
                "expiration": 0,
                "order": order + 1,  # Use order + 1 for closing as per working example
                "price": price,
                "sl": 0.0,
                "symbol": symbol,
                "tp": 0.0,
                "type": TransactionType.ORDER_CLOSE,
                "volume": volume
            }

            logger.info("Closing trade with info: %s", close_trans_info)
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {"tradeTransInfo": close_trans_info}
            })

            if response.get("status"):
                close_order = response["returnData"]["order"]
                logger.info("✅ Trade closed successfully, order: %s", close_order)
                return {
                    "status": True,
                    "returnData": {
                        "order": close_order,
                        "status": "Closed",
                        "customComment": close_trans_info["customComment"]
                    }
                }
            else:
                logger.error("❌ Trade close failed: %s", response)
                return response

        except Exception as e:
            logger.error("❌ Error closing trade: %s", str(e), exc_info=True)
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
                elif command == 'closeTrade':
                    response = await bridge.close_trade(data.get('closeInfo', {}))
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
    max_retries = 5
    retry_delay = 2  # seconds

    for attempt in range(max_retries):
        try:
            # Wait a bit before starting to ensure old process is cleaned up
            if attempt > 0:
                logger.info(f"Retrying to start server (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(retry_delay)

            server = await websockets.serve(
                handle_client,
                "0.0.0.0",  # Listen on all interfaces
                8765  # Port for WebSocket server
            )
            logger.info("XTB Bridge WebSocket server started on port 8765")
            await server.wait_closed()
            break
        except Exception as e:
            logger.error(f"Error starting WebSocket server: {str(e)}", exc_info=True)
            if attempt == max_retries - 1:
                raise

if __name__ == "__main__":
    logger.info("Starting XTB Bridge service")
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        logger.info("XTB Bridge service stopped by user")
    except Exception as e:
        logger.error(f"XTB Bridge service crashed: {str(e)}", exc_info=True)