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

# Configure logging
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
            self.client = APIClient(encrypt=True)  # Ensure encryption is enabled
            response = self.client.execute(loginCommand(
                userId=credentials.get("userId", "17535100"),
                password=credentials.get("password", "GuiZarHoh2711!"),
                appName="Hedgi"
            ))

            if response.get("status"):
                logger.info("✅ Logged in successfully!")
                self.ssid = response.get("streamSessionId")
                logger.info("🔗 Stream session ID: %s", self.ssid)
                self.connected = True
                return {
                    "status": True,
                    "streamSessionId": self.ssid
                }
            else:
                logger.error("❌ Login failed: %s", response)
                return {
                    "status": False,
                    "error": response.get("errorDescr", "Login failed")
                }
        except Exception as e:
            logger.error("❌ Connection error: %s", str(e), exc_info=True)
            return {
                "status": False,
                "error": str(e)
            }

    async def check_trade_status(self, order: int) -> Dict[str, Any]:
        """Check the trade status."""
        if not self.client or not self.connected:
            logger.error("Cannot check trade status: Not connected to XTB")
            return {
                "status": False,
                "error": "Not connected to XTB"
            }

        try:
            logger.info("📊 Checking trade status for order: %s", order)
            response = self.client.commandExecute("tradeTransactionStatus", {"order": order})
            logger.info("📊 Trade status: %s", response)
            return response
        except Exception as e:
            logger.error("❌ Error checking trade status: %s", str(e), exc_info=True)
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
                8765,       # Port for WebSocket server
                ping_interval=None,  # Disable automatic ping
                ping_timeout=None,   # Disable ping timeout
                process_request=None  # Let websockets handle the handshake
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