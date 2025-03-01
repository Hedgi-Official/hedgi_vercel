import logging
import traceback
from xAPIConnector import APIClient, APIStreamClient, TransactionSide, TransactionType

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s\nContext: %(context)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class ContextLogger:
    def __init__(self, logger, default_context=None):
        self.logger = logger
        self.default_context = default_context or {}

    def _log(self, level, msg, context=None, *args, **kwargs):
        context_dict = self.default_context.copy()
        if context:
            context_dict.update(context)
        extra = {'context': str(context_dict)}
        if 'extra' in kwargs:
            kwargs['extra'].update(extra)
        else:
            kwargs['extra'] = extra
        return getattr(self.logger, level)(msg, *args, **kwargs)

    def info(self, msg, context=None, *args, **kwargs):
        return self._log('info', msg, context, *args, **kwargs)

    def error(self, msg, context=None, *args, **kwargs):
        if 'exc_info' not in kwargs:
            kwargs['exc_info'] = True
        return self._log('error', msg, context, *args, **kwargs)

    def warning(self, msg, context=None, *args, **kwargs):
        return self._log('warning', msg, context, *args, **kwargs)

    def debug(self, msg, context=None, *args, **kwargs):
        return self._log('debug', msg, context, *args, **kwargs)

logger = ContextLogger(logging.getLogger(__name__))

class XTBTrader:
    def __init__(self):
        self.client = None
        self.stream_client = None
        self.stream_session_id = None

    def connect(self, user_id: str, password: str) -> dict:
        """Connect to XTB API and login with enhanced logging"""
        context = {'userId': user_id}
        try:
            logger.info("Connecting to XTB API...", context=context)
            self.client = APIClient()

            # Execute login command
            login_response = self.client.execute({
                "command": "login",
                "arguments": {
                    "userId": int(user_id),
                    "password": password,
                    "appName": "Hedgi"
                }
            })

            context.update({'loginResponse': login_response})
            logger.info("Login response received", context=context)

            if not login_response.get('status'):
                error_code = login_response.get('errorCode', 'Unknown')
                error_desc = login_response.get('errorDescr', 'Unknown error')
                error_msg = f"Login failed: {error_code} - {error_desc}"
                logger.error(error_msg, context=context)
                return {"success": False, "error": error_msg}

            self.stream_session_id = login_response.get('streamSessionId')
            logger.info("Successfully connected to XTB API", context={'sessionId': self.stream_session_id})
            return {"success": True, "sessionId": self.stream_session_id}

        except Exception as e:
            error_msg = f"Connection error: {str(e)}"
            logger.error(error_msg, context=context)
            return {"success": False, "error": error_msg}

    def open_trade(self, symbol: str, volume: float, is_buy: bool) -> dict:
        """Open a new trade position with enhanced logging"""
        context = {
            'symbol': symbol,
            'volume': volume,
            'is_buy': is_buy,
            'action': 'OPEN'
        }

        try:
            if not self.client:
                logger.error("Not connected to XTB API", context=context)
                return {"success": False, "error": "Not connected to XTB API"}

            # Prepare trade transaction info
            trade_info = {
                "cmd": TransactionSide.BUY if is_buy else TransactionSide.SELL,
                "symbol": symbol,
                "volume": float(volume),
                "type": TransactionType.ORDER_OPEN,
                "price": 0.0  # Market price
            }

            context.update({'trade_info': trade_info})
            logger.info("Opening trade", context=context)

            # Execute trade transaction
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {
                    "tradeTransInfo": trade_info
                }
            })

            context.update({'response': response})
            logger.info("Trade response received", context=context)

            if not response.get('status'):
                error_code = response.get('errorCode', 'Unknown')
                error_desc = response.get('errorDescr', 'Unknown error')
                error_msg = f"Trade failed: {error_code} - {error_desc}"
                logger.error(error_msg, context=context)
                return {"success": False, "error": error_msg}

            # Get the order number from the response
            return_data = response.get('returnData', {})
            order_number = return_data.get('order', 0)
            if not order_number:
                logger.warning("Trade might have succeeded but no order number was returned", context=context)

            logger.info("Trade opened successfully", context={'orderId': order_number})
            return {"success": True, "orderId": order_number}

        except Exception as e:
            error_msg = f"Trade error: {str(e)}"
            logger.error(error_msg, context=context)
            return {"success": False, "error": error_msg}

    def close_trade(self, symbol: str, volume: float, order_id: int, is_buy: bool) -> dict:
        """Close an existing trade position with enhanced logging"""
        context = {
            'symbol': symbol,
            'volume': volume,
            'order_id': order_id,
            'is_buy': is_buy,
            'action': 'CLOSE'
        }

        try:
            if not self.client:
                logger.error("Not connected to XTB API", context=context)
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

            context.update({'trade_info': trade_info})
            logger.info("Closing trade", context=context)

            # Execute trade transaction
            response = self.client.execute({
                "command": "tradeTransaction",
                "arguments": {
                    "tradeTransInfo": trade_info
                }
            })

            context.update({'response': response})
            logger.info("Close trade response received", context=context)

            if not response.get('status'):
                error_code = response.get('errorCode', 'Unknown')
                error_desc = response.get('errorDescr', 'Unknown error')
                error_msg = f"Close trade failed: {error_code} - {error_desc}"
                logger.error(error_msg, context=context)
                return {"success": False, "error": error_msg}

            # Get the closing order number from the response
            return_data = response.get('returnData', {})
            close_order_number = return_data.get('order', 0)
            logger.info("Trade closed successfully", context={'orderId': close_order_number})

            return {"success": True, "orderId": close_order_number}

        except Exception as e:
            error_msg = f"Close trade error: {str(e)}"
            logger.error(error_msg, context=context)
            return {"success": False, "error": error_msg}

    def check_trade_status(self, order_id: int) -> dict:
        """Check the status of a trade with enhanced logging"""
        context = {'order_id': order_id}
        try:
            if not self.client:
                logger.error("Not connected to XTB API", context=context)
                return {"success": False, "error": "Not connected to XTB API"}

            logger.info("Checking trade status", context=context)

            # Execute trade status command
            response = self.client.execute({
                "command": "tradeTransactionStatus",
                "arguments": {
                    "order": int(order_id)
                }
            })

            context.update({'response': response})
            logger.info("Trade status response received", context=context)

            if not response.get('status'):
                error_code = response.get('errorCode', 'Unknown')
                error_desc = response.get('errorDescr', 'Unknown error')
                error_msg = f"Status check failed: {error_code} - {error_desc}"
                logger.error(error_msg, context=context)
                return {"success": False, "error": error_msg}

            return {"success": True, "status": response.get('returnData', {})}

        except Exception as e:
            error_msg = f"Status check error: {str(e)}"
            logger.error(error_msg, context=context)
            return {"success": False, "error": error_msg}

    def disconnect(self) -> dict:
        """Disconnect from XTB API with enhanced logging"""
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