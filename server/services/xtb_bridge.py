import json
import asyncio
import websockets
import websockets.exceptions
from threading import Thread, Timer
import logging
import ssl
from typing import Dict, Any, Optional
import time
import sys
import os

# Import the XTB API wrapper classes
from APIClient import APIClient, APIStreamClient, TransactionSide, TransactionType, loginCommand, baseCommand

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
        self._reconnect_attempts = 0
        self._max_reconnect_attempts = 3

    async def connect(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        """
        Connect to XTB API using the provided credentials.
        This implementation follows the working example's approach.
        """
        try:
            logger.info("Attempting to connect to XTB")

            # Create client with encryption enabled (important for XTB)
            self.client = APIClient(address='xapia.x-station.eu', port=5124, encrypt=True)

            # Execute login command using the helper function from working example
            response = self.client.execute(loginCommand(
                userId=credentials.get("userId", "17535100"),  # Default from working example
                password=credentials.get("password", "GuiZarHoh2711!"),  # Default from working example
                appName="Hedgi"
            ))

            if response.get("status"):
                logger.info("✅ Logged in successfully!")
                self.ssid = response.get("streamSessionId")
                logger.info("🔗 Stream session ID: %s", self.ssid)
                self.connected = True
                self._reconnect_attempts = 0

                # Initialize streaming client as in working example
                self.stream_client = APIStreamClient(
                    address='xapia.x-station.eu',
                    port=5125,  # Streaming port
                    encrypt=True,
                    ssId=self.ssid,
                )

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

    def disconnect(self):
        """Disconnect from XTB API, following working example pattern"""
        logger.info("Disconnecting from XTB")

        if self.stream_client:
            try:
                self.stream_client.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting stream client: {str(e)}")
            self.stream_client = None

        if self.client:
            try:
                self.client.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting main client: {str(e)}")
            self.client = None

        self.connected = False
        self.ssid = None
        logger.info("Disconnected from XTB")

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
            if attempt > 0:
                logger.info(f"Retrying to start server (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(retry_delay)

            # Start WebSocket server with explicit settings
            server = await websockets.serve(
                handle_client,
                "0.0.0.0",    # Listen on all interfaces
                8765,         # Port for WebSocket server
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