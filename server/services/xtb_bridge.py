import json
import asyncio
import websockets
import websockets.exceptions
from threading import Thread
import logging
import ssl
from typing import Dict, Any, Optional
import time
import sys
import os

# Import the XTB API wrapper classes
from APIClient import APIClient, APIStreamClient, TransactionSide, TransactionType, loginCommand, baseCommand

# Configure logging with the same format as working example
logger = logging.getLogger("XTB_Bridge")
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)

class XTBBridge:
    def __init__(self):
        self.client: Optional[APIClient] = None
        self.stream_client: Optional[APIStreamClient] = None
        self.connected = False
        self.ssid = None

    async def connect(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        """Establish connection and log in."""
        try:
            logger.info("Attempting to connect to XTB")

            # Create client as per working example
            self.client = APIClient(address='xapia.x-station.eu', port=5124, encrypt=True)

            # Use exact credentials from working example as defaults
            userId = credentials.get("userId", "17535100")
            password = credentials.get("password", "GuiZarHoh2711!")

            logger.info(f"Attempting login with user ID: {userId}")
            response = self.client.execute(loginCommand(userId, password))

            if response.get("status"):
                logger.info("✅ Logged in successfully!")
                self.ssid = response.get("streamSessionId")
                logger.info("🔗 Stream session ID: %s", self.ssid)
                self.connected = True

                # Initialize streaming client with proper parameters
                try:
                    self.stream_client = APIStreamClient(
                        address='xapia.x-station.eu',
                        port=5125,
                        encrypt=True,
                        ssId=self.ssid
                    )
                    logger.info("Stream client initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize stream client: {e}")
                    # Continue even if streaming fails, as main connection is established

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
        """Disconnect from API."""
        if self.client:
            try:
                self.client.disconnect()
                logger.info("🔌 Disconnected from XTB API.")
            except Exception as e:
                logger.error(f"Error during disconnect: {e}")

        if self.stream_client:
            try:
                self.stream_client.disconnect()
                logger.info("🔌 Disconnected streaming client.")
            except Exception as e:
                logger.error(f"Error during stream disconnect: {e}")

        self.connected = False
        self.ssid = None

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
                    logger.info(f"Connect response: {response}")
                else:
                    logger.warning(f"Unknown command received: {command}")
                    response = {
                        "status": False,
                        "error": f"Unknown command: {command}"
                    }

                await websocket.send(json.dumps(response))

            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received: {e}")
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

            server = await websockets.serve(
                handle_client,
                "0.0.0.0",
                8765,
                ping_interval=None,
                ping_timeout=None
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