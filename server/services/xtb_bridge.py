import json
import asyncio
import websockets
from sys import path
from os.path import dirname, join
import logging
import traceback

# Add the directory containing xAPIConnector to Python path
path.append(join(dirname(__file__), '../../attached_assets'))
from xAPIConnector import APIClient, APIStreamClient

# Enhanced logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class XTBBridge:
    def __init__(self):
        self.client = None
        self.stream_client = None
        self.ssid = None

    async def connect(self, userId, password):
        try:
            logger.info("Attempting to connect to XTB API...")
            self.client = APIClient()
            login_response = self.client.execute({
                'command': 'login',
                'arguments': {
                    'userId': userId,
                    'password': password
                }
            })

            if not login_response.get('status'):
                logger.error(f"Login failed with error code: {login_response.get('errorCode')}")
                return {'success': False, 'error': f"Login failed: {login_response.get('errorCode')}"}

            self.ssid = login_response['streamSessionId']
            logger.info("Successfully connected to XTB API")
            return {'success': True, 'sessionId': self.ssid}
        except Exception as e:
            logger.error(f"Connection error: {str(e)}\n{traceback.format_exc()}")
            return {'success': False, 'error': str(e)}

    async def place_trade(self, symbol, volume, command, order_type):
        try:
            if not self.client:
                logger.error("Attempted to place trade without connection")
                return {'success': False, 'error': 'Not connected'}

            logger.info(f"Placing trade: {symbol}, volume: {volume}, command: {command}, type: {order_type}")
            trade_response = self.client.execute({
                'command': 'tradeTransaction',
                'arguments': {
                    'tradeTransInfo': {
                        'cmd': command,  # 0 for BUY, 1 for SELL
                        'symbol': symbol,
                        'volume': volume,
                        'type': order_type,  # 0 for OPEN, 2 for CLOSE
                        'price': 0.0  # Market price
                    }
                }
            })

            logger.info(f"Trade placed successfully: {trade_response}")
            return {'success': True, 'response': trade_response}
        except Exception as e:
            logger.error(f"Trade error: {str(e)}\n{traceback.format_exc()}")
            return {'success': False, 'error': str(e)}

    async def check_trade_status(self, order_id):
        try:
            if not self.client:
                logger.error("Attempted to check trade status without connection")
                return {'success': False, 'error': 'Not connected'}

            logger.info(f"Checking trade status for order: {order_id}")
            status_response = self.client.execute({
                'command': 'tradeTransactionStatus',
                'arguments': {
                    'order': order_id
                }
            })

            logger.info(f"Trade status check: {status_response}")
            return {'success': True, 'status': status_response}
        except Exception as e:
            logger.error(f"Status check error: {str(e)}\n{traceback.format_exc()}")
            return {'success': False, 'error': str(e)}

    async def disconnect(self):
        try:
            logger.info("Disconnecting from XTB API...")
            if self.stream_client:
                self.stream_client.disconnect()
            if self.client:
                self.client.disconnect()
            logger.info("Successfully disconnected from XTB API")
            return {'success': True}
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}\n{traceback.format_exc()}")
            return {'success': False, 'error': str(e)}

async def websocket_handler(websocket, path):
    bridge = XTBBridge()
    logger.info("New WebSocket connection established")

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                command = data.get('command')
                logger.info(f"Received command: {command}")

                if command == 'connect':
                    response = await bridge.connect(data['userId'], data['password'])
                elif command == 'trade':
                    response = await bridge.place_trade(
                        data['symbol'],
                        data['volume'],
                        data['command'],
                        data['orderType']
                    )
                elif command == 'status':
                    response = await bridge.check_trade_status(data['orderId'])
                elif command == 'disconnect':
                    response = await bridge.disconnect()
                else:
                    logger.warning(f"Unknown command received: {command}")
                    response = {'success': False, 'error': 'Unknown command'}

                await websocket.send(json.dumps(response))
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
                await websocket.send(json.dumps({'success': False, 'error': 'Invalid JSON'}))
            except Exception as e:
                logger.error(f"Command processing error: {str(e)}\n{traceback.format_exc()}")
                await websocket.send(json.dumps({'success': False, 'error': str(e)}))
    except websockets.exceptions.ConnectionClosed:
        logger.info("WebSocket connection closed")
    except Exception as e:
        logger.error(f"WebSocket handler error: {str(e)}\n{traceback.format_exc()}")

async def main():
    try:
        port = 8765
        logger.info(f"Starting XTB Bridge WebSocket server on port {port}...")
        server = await websockets.serve(
            websocket_handler,
            '0.0.0.0',  # Listen on all interfaces
            port  # WebSocket port
        )
        logger.info(f"XTB Bridge WebSocket server started successfully on port {port}")
        await server.wait_closed()
    except Exception as e:
        logger.error(f"Server startup error: {str(e)}\n{traceback.format_exc()}")
        raise

if __name__ == "__main__":
    try:
        logger.info("Initializing XTB Bridge...")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}\n{traceback.format_exc()}")
        raise