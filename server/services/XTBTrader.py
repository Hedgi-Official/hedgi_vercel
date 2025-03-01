import logging
from xAPIConnector import APIClient, TransactionSide, TransactionType

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class XTBTrader:
    def __init__(self):
        self.client = None
        self.stream_session_id = None

    def connect(self, user_id: str, password: str) -> dict:
        """Connect to XTB API and login"""
        try:
            logger.info("Connecting to XTB API...")
            # Initialize client with demo server address
            self.client = APIClient(address='demo.xtb.com')

            # Execute login command
            login_response = self.client.execute({
                "command": "login",
                "arguments": {
                    "userId": user_id,
                    "password": password,
                    "appName": "Hedgi"
                }
            })

            logger.info(f"Login response received: {login_response}")

            if not login_response.get('status'):
                error_msg = f"Login failed: {login_response.get('errorCode')} - {login_response.get('errorDescr', 'Unknown error')}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            self.stream_session_id = login_response.get('streamSessionId')
            logger.info(f"Successfully connected to XTB API with session ID: {self.stream_session_id}")
            return {"success": True, "sessionId": self.stream_session_id}

        except Exception as e:
            error_msg = f"Connection error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def open_trade(self, symbol: str, volume: float, is_buy: bool) -> dict:
        """Open a new trade position"""
        try:
            if not self.client:
                return {"success": False, "error": "Not connected to XTB API"}

            # Prepare trade transaction info
            trade_info = {
                "cmd": TransactionSide.BUY if is_buy else TransactionSide.SELL,
                "symbol": symbol,
                "volume": volume,
                "type": TransactionType.ORDER_OPEN,
                "price": 0.0  # Market price
            }

            logger.info(f"Opening trade: {trade_info}")

            # Execute trade transaction
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {
                    "tradeTransInfo": trade_info
                }
            })

            if not response.get('status'):
                error_msg = f"Trade failed: {response.get('errorCode')}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            # Get the order number from the response
            order_number = response['returnData'].get('order', 0)
            logger.info(f"Trade opened successfully. Order number: {order_number}")

            return {"success": True, "orderId": order_number}

        except Exception as e:
            error_msg = f"Trade error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def close_trade(self, symbol: str, volume: float, order_id: int, is_buy: bool) -> dict:
        """Close an existing trade position"""
        try:
            if not self.client:
                return {"success": False, "error": "Not connected to XTB API"}

            # Prepare trade transaction info for closing
            trade_info = {
                "cmd": TransactionSide.SELL if is_buy else TransactionSide.BUY,  # Opposite of opening transaction
                "symbol": symbol,
                "volume": volume,
                "type": TransactionType.ORDER_CLOSE,
                "price": 0.0,  # Market price
                "order": order_id
            }

            logger.info(f"Closing trade: {trade_info}")

            # Execute trade transaction
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {
                    "tradeTransInfo": trade_info
                }
            })

            if not response.get('status'):
                error_msg = f"Close trade failed: {response.get('errorCode')}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            # Get the closing order number from the response
            close_order_number = response['returnData'].get('order', 0)
            logger.info(f"Trade closed successfully. Closing order number: {close_order_number}")

            return {"success": True, "orderId": close_order_number}

        except Exception as e:
            error_msg = f"Close trade error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def check_trade_status(self, order_id: int) -> dict:
        """Check the status of a trade"""
        try:
            if not self.client:
                return {"success": False, "error": "Not connected to XTB API"}

            logger.info(f"Checking trade status for order: {order_id}")

            # Execute trade status command
            response = self.client.execute({
                "command": "tradeTransactionStatus",
                "arguments": {
                    "order": order_id
                }
            })

            if not response.get('status'):
                error_msg = f"Status check failed: {response.get('errorCode')}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            logger.info(f"Trade status response: {response}")
            return {"success": True, "status": response['returnData']}

        except Exception as e:
            error_msg = f"Status check error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def disconnect(self) -> dict:
        """Disconnect from XTB API"""
        try:
            if self.client:
                self.client.disconnect()

            self.client = None
            self.stream_session_id = None

            logger.info("Successfully disconnected from XTB API")
            return {"success": True}

        except Exception as e:
            error_msg = f"Disconnect error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}