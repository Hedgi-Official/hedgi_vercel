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
        self.reconnect_timer = None
        self.credentials = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_delay = 5  # seconds

    async def connect(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        self.credentials = credentials  # Store credentials for reconnection
        try:
            if self.reconnect_timer:
                self.reconnect_timer.cancel()
                self.reconnect_timer = None
                
            logger.info("Attempting to connect to XTB")
            self.client = APIClient(encrypt=True)  # Ensure encryption is enabled
            
            # Ensure we have credentials
            if not credentials.get("userId") or not credentials.get("password"):
                logger.error("❌ Missing credentials")
                return {
                    "status": False,
                    "error": "Missing credentials"
                }
                
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
                self.reconnect_attempts = 0  # Reset reconnect attempts on success
                
                # Schedule heartbeat to keep connection alive
                self._schedule_heartbeat()
                
                return {
                    "status": True,
                    "streamSessionId": self.ssid
                }
            else:
                logger.error("❌ Login failed: %s", response)
                self._schedule_reconnect()
                return {
                    "status": False,
                    "error": response.get("errorDescr", "Login failed")
                }
        except Exception as e:
            logger.error("❌ Connection error: %s", str(e), exc_info=True)
            self._schedule_reconnect()
            return {
                "status": False,
                "error": str(e)
            }
            
    def _schedule_heartbeat(self):
        """Schedule a heartbeat to keep the connection alive"""
        async def heartbeat():
            while self.connected and self.client:
                try:
                    logger.debug("Sending heartbeat to XTB server")
                    response = self.client.execute({"command": "ping"})
                    if not response.get("status", False):
                        logger.warning("Heartbeat failed, scheduling reconnect")
                        self._schedule_reconnect()
                        break
                except Exception as e:
                    logger.error("❌ Heartbeat error: %s", str(e))
                    self._schedule_reconnect()
                    break
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                
        # Start heartbeat in background
        asyncio.create_task(heartbeat())
        
    def _schedule_reconnect(self):
        """Schedule a reconnection attempt"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error("❌ Max reconnection attempts reached")
            return
            
        self.reconnect_attempts += 1
        delay = self.reconnect_delay * self.reconnect_attempts
        
        logger.info(f"Scheduling reconnection attempt {self.reconnect_attempts} in {delay} seconds")
        
        async def do_reconnect():
            logger.info("Attempting to reconnect to XTB")
            await self.connect(self.credentials)
            
        self.reconnect_timer = Timer(delay, lambda: asyncio.create_task(do_reconnect()))
        self.reconnect_timer.daemon = True
        self.reconnect_timer.start()
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
        """Properly disconnect from XTB services"""
        logger.info("Disconnecting from XTB")
        
        # Cancel any pending reconnection attempts
        if self.reconnect_timer:
            self.reconnect_timer.cancel()
            self.reconnect_timer = None
            
        # Disconnect stream client if exists
        if self.stream_client:
            try:
                self.stream_client.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting stream client: {str(e)}")
            self.stream_client = None
            
        # Disconnect main client if exists
        if self.client:
            try:
                # Try to send logout command before disconnecting
                try:
                    self.client.execute({"command": "logout"})
                except:
                    pass
                self.client.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting client: {str(e)}")
            self.client = None
            
        self.connected = False
        self.ssid = None
        logger.info("Successfully disconnected from XTB")

async def handle_client(websocket, path):
    bridge = XTBBridge()
    logger.info("New WebSocket client connected")

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                command = data.get('command')
                logger.info(f"Received command: {command}")mand: {command}")

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