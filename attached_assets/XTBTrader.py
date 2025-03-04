import logging
from xAPIConnector import APIClient, APIStreamClient, TransactionSide, TransactionType

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
        self.stream_client = None
        self.stream_session_id = None

    def connect(self, user_id: str, password: str) -> dict:
        """Connect to XTB API and login"""
        try:
            logger.info("Connecting to XTB API...")
            self.client = APIClient()

            # Execute login command
            login_response = self.client.execute({
                "command": "login",
                "arguments": {
                    "userId": user_id,
                    "password": password
                }
            })

            if not login_response.get('status'):
                error_msg = f"Login failed: {login_response.get('errorCode')}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            self.stream_session_id = login_response.get('streamSessionId')
            logger.info("Successfully connected to XTB API")
            return {"success": True, "sessionId": self.stream_session_id}

        except Exception as e:
            error_msg = f"Connection error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def execute_transaction(self, trade_info: dict) -> dict:
        """Execute a trade transaction with XTB API"""
        try:
            if not self.client:
                return {"success": False, "error": "Not connected to XTB API"}

            # Make sure volume is within allowed limits (usually 0.01 to 100)
            # XTB uses "lots" where 1 lot = 100,000 units of base currency
            if trade_info.get('volume', 0) < 0.01:
                trade_info['volume'] = 0.01  # Minimum allowed volume

            logger.info(f"Executing trade transaction: {trade_info}")

            # Execute trade transaction
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {
                    "tradeTransInfo": trade_info
                }
            })

            # Log detailed response for debugging
            logger.info(f"Trade transaction response: {response}")

            if not response.get('status'):
                error_msg = f"Trade transaction failed: {response.get('errorCode')} - {response.get('errorDescr', 'Unknown error')}"
                logger.error(error_msg)
                return {"success": False, "error": error_msg}

            # Get the order number from the response
            order_number = response['returnData'].get('order', 0)
            logger.info(f"Trade transaction successful. Order number: {order_number}")

            # Check transaction status to verify it was accepted
            if order_number > 0:
                status_response = self.check_transaction_status(order_number)
                logger.info(f"Transaction status: {status_response}")

            return {"success": True, "orderId": order_number}

        except Exception as e:
            error_msg = f"Trade transaction error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def check_transaction_status(self, order_number: int) -> dict:
        """Check the status of a trade transaction"""
        try:
            if not self.client:
                return {"success": False, "error": "Not connected to XTB API"}

            response = self.client.execute({
                "command": "tradeTransactionStatus",
                "arguments": {
                    "order": order_number
                }
            })

            return response
        except Exception as e:
            error_msg = f"Transaction status check error: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def open_trade(self, symbol: str, volume: float, is_buy: bool, price: float = 0.0, custom_comment: str = None) -> dict:
        """Open a new trade position"""
        # Create trade info according to XTB documentation format
        trade_info = {
            "cmd": 0 if is_buy else 1,  # 0 for BUY, 1 for SELL
            "symbol": symbol,
            "volume": volume,
            "type": 0,  # 0 for OPEN
            "price": price,  # Use provided price or 0.0 for market price
            "customComment": custom_comment or f"Hedge position for {symbol}"  # Add comment to track trades
        }

        return self.execute_transaction(trade_info)

    def close_trade(self, symbol: str, volume: float, order_id: int, is_buy: bool) -> dict:
        """Close an existing trade position"""
        # Create trade info according to XTB documentation format
        trade_info = {
            "cmd": 0 if is_buy else 1,  # Same direction as the opening transaction for XTB close
            "symbol": symbol,
            "volume": volume,
            "type": 2,  # 2 for CLOSE
            "price": 0.0,  # Market price
            "order": order_id
        }

        return self.execute_transaction(trade_info)

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