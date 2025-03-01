import logging
import sys
from xAPIConnector import APIClient, APIStreamClient, TransactionSide, TransactionType

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class XTBTrader:
    def __init__(self):
        self.client = None
        self.stream_client = None
        self.stream_session_id = None

    def connect(self, user_id: str, password: str) -> dict:
        """Connect to XTB API and login with enhanced logging"""
        context = {'userId': user_id}
        try:
            logger.info(f"Connecting to XTB API... [userId={user_id}]")
            self.client = APIClient()

            # Convert userId to int if it's numeric
            user_id_param = int(user_id) if user_id.isdigit() else user_id

            # Execute login command
            login_response = self.client.execute({
                "command": "login",
                "arguments": {
                    "userId": user_id_param,
                    "password": password,
                    "appName": "Hedgi"
                }
            })

            logger.info(f"Login response received: {login_response}")

            if not login_response.get('status'):
                error_code = login_response.get('errorCode', 'Unknown')
                error_desc = login_response.get('errorDescr', 'Unknown error')
                error_msg = f"Login failed: {error_code} - {error_desc}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            self.stream_session_id = login_response.get('streamSessionId')
            logger.info(f"Successfully connected to XTB API [sessionId={self.stream_session_id}]")
            return {"success": True, "sessionId": self.stream_session_id}

        except Exception as e:
            error_msg = f"Connection error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def open_trade(self, symbol: str, volume: float, is_buy: bool) -> dict:
        """Open a new trade position with enhanced logging"""
        try:
            logger.info(f"Opening trade: {symbol}, volume={volume}, is_buy={is_buy}")

            if not self.client:
                logger.error("Not connected to XTB API")
                return {"success": False, "error": "Not connected to XTB API"}

            # Prepare trade transaction info
            trade_info = {
                "cmd": TransactionSide.BUY if is_buy else TransactionSide.SELL,
                "symbol": symbol,
                "volume": float(volume),
                "type": TransactionType.ORDER_OPEN,
                "price": 0.0  # Market price
            }

            logger.info(f"Trade info: {trade_info}")

            # Execute trade transaction
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {
                    "tradeTransInfo": trade_info
                }
            })

            logger.info(f"Trade response received: {response}")

            if not response.get('status'):
                error_code = response.get('errorCode', 'Unknown')
                error_desc = response.get('errorDescr', 'Unknown error')
                error_msg = f"Trade failed: {error_code} - {error_desc}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            # Get the order number from the response
            return_data = response.get('returnData', {})
            order_number = return_data.get('order', 0)
            logger.info(f"Trade opened successfully. Order number: {order_number}")

            return {"success": True, "orderId": order_number}

        except Exception as e:
            error_msg = f"Trade error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def close_trade(self, symbol: str, volume: float, order_id: int, is_buy: bool) -> dict:
        """Close an existing trade position with enhanced logging"""
        try:
            logger.info(f"Closing trade: symbol={symbol}, volume={volume}, order_id={order_id}, is_buy={is_buy}")

            if not self.client:
                logger.error("Not connected to XTB API")
                return {"success": False, "error": "Not connected to XTB API"}

            # Prepare trade transaction info for closing
            trade_info = {
                "cmd": TransactionSide.SELL if is_buy else TransactionSide.BUY,  # Opposite of opening transaction
                "symbol": symbol,
                "volume": float(volume),
                "type": TransactionType.ORDER_CLOSE,
                "price": 0.0,  # Market price
                "order": int(order_id)
            }

            logger.info(f"Closing trade info: {trade_info}")

            # Execute trade transaction
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {
                    "tradeTransInfo": trade_info
                }
            })

            logger.info(f"Close trade response received: {response}")

            if not response.get('status'):
                error_code = response.get('errorCode', 'Unknown')
                error_desc = response.get('errorDescr', 'Unknown error')
                error_msg = f"Close trade failed: {error_code} - {error_desc}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            # Get the closing order number from the response
            return_data = response.get('returnData', {})
            close_order_number = return_data.get('order', 0)
            logger.info(f"Trade closed successfully. Closing order number: {close_order_number}")

            return {"success": True, "orderId": close_order_number}

        except Exception as e:
            error_msg = f"Close trade error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def check_trade_status(self, order_id: int) -> dict:
        """Check the status of a trade with enhanced logging"""
        try:
            logger.info(f"Checking trade status for order: {order_id}")

            if not self.client:
                logger.error("Not connected to XTB API")
                return {"success": False, "error": "Not connected to XTB API"}

            # Execute trade status command
            response = self.client.execute({
                "command": "tradeTransactionStatus",
                "arguments": {
                    "order": int(order_id)
                }
            })

            logger.info(f"Trade status response: {response}")

            if not response.get('status'):
                error_code = response.get('errorCode', 'Unknown')
                error_desc = response.get('errorDescr', 'Unknown error')
                error_msg = f"Status check failed: {error_code} - {error_desc}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            return {"success": True, "status": response.get('returnData', {})}

        except Exception as e:
            error_msg = f"Status check error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def disconnect(self) -> dict:
        """Disconnect from XTB API with enhanced logging"""
        try:
            logger.info("Disconnecting from XTB API")

            if self.stream_client:
                self.stream_client.disconnect()
            if self.client:
                self.client.disconnect()

            self.client = None
            self.stream_client = None
            self.stream_session_id = None

            logger.info("Successfully disconnected from XTB API")
            return {"success": True}

        except Exception as e:
            error_msg = f"Disconnect error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}