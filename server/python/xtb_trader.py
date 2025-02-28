import logging
import time
from typing import Optional, Dict, Any
from .xtb_api import APIClient, loginCommand, TransactionSide, TransactionType

logger = logging.getLogger("xtbTrader")
logger.setLevel(logging.INFO)

class XTBTrader:
    def __init__(self, user_id: str, password: str):
        self.client = None
        self.user_id = user_id
        self.password = password

    def connect(self) -> bool:
        """Establish connection and log in."""
        try:
            logger.info("Creating XTB API client...")
            self.client = APIClient()

            logger.info("Sending login command...")
            response = self.client.execute(loginCommand(self.user_id, self.password))

            if response.get("status"):
                logger.info("✅ Logged in successfully!")
                self.ssid = response.get("streamSessionId")
                logger.info("🔗 Stream session ID: %s", self.ssid)
                return True
            else:
                logger.error("❌ Login failed: %s", response)
                return False
        except Exception as e:
            logger.error("❌ Connection error: %s", str(e))
            return False

    def place_trade(self, symbol: str, volume: float, price: float, is_buy: bool, 
                    custom_comment: str = "") -> Optional[int]:
        """Place a market order."""
        try:
            # Adjust volume for certain currency pairs
            adjusted_volume = volume / 100000 if symbol in ['USDBRL', 'USDMXN'] else volume

            trade_info = {
                "cmd": TransactionSide.BUY if is_buy else TransactionSide.SELL,
                "customComment": custom_comment,
                "expiration": 0,
                "offset": 0,
                "order": 0,  # For new orders, this is set to 0
                "price": price,
                "sl": 0.0,  # Stop loss
                "symbol": symbol,
                "tp": 0.0,  # Take profit
                "type": TransactionType.ORDER_OPEN,
                "volume": adjusted_volume
            }

            logger.info("Placing trade: %s", {
                **trade_info,
                "original_volume": volume,
                "adjusted_volume": adjusted_volume
            })

            response = self.client.commandExecute("tradeTransaction", {"tradeTransInfo": trade_info})
            if response.get("status"):
                order_number = response["returnData"]["order"]
                logger.info("✅ Trade placed successfully, order number: %s", order_number)
                return order_number
            else:
                logger.error("❌ Trade placement failed: %s", response)
                return None
        except Exception as e:
            logger.error("❌ Error placing trade: %s", str(e))
            return None

    def check_trade_status(self, order: int) -> Dict[str, Any]:
        """Check the trade status."""
        try:
            logger.info("Checking status for order: %s", order)
            response = self.client.commandExecute("tradeTransactionStatus", {"order": order})
            logger.info("📊 Trade status response: %s", response)

            if response.get("status"):
                # Map the response to our expected format
                status_map = {
                    0: "Error",
                    1: "Pending",
                    3: "Accepted",
                    4: "Rejected"
                }

                returnData = response.get("returnData", {})
                formatted_response = {
                    "status": status_map.get(returnData.get("requestStatus"), "Unknown"),
                    "order": order,
                    "customComment": returnData.get("customComment", ""),
                    "message": returnData.get("message"),
                    "requestStatus": returnData.get("requestStatus"),
                    "price": returnData.get("price", 0.0),
                    "errorCode": returnData.get("errorCode"),
                    "errorDescr": returnData.get("errorDescr")
                }
                return formatted_response
            else:
                return {
                    "status": "Error",
                    "order": order,
                    "errorDescr": "Failed to get trade status"
                }
        except Exception as e:
            logger.error("❌ Error checking trade status: %s", str(e))
            return {
                "status": "Error",
                "order": order,
                "errorDescr": str(e)
            }

    def close_trade(self, order: int, symbol: str, volume: float, is_buy: bool, price: Optional[float] = None) -> Optional[int]:
        """Close an existing trade."""
        try:
            # Adjust volume for certain currency pairs
            adjusted_volume = volume / 100000 if symbol in ['USDBRL', 'USDMXN'] else volume

            # For closing, we use the opposite command of the original trade
            close_cmd = TransactionSide.SELL if is_buy else TransactionSide.BUY

            if price is None:
                # Get current price from trade status
                status = self.check_trade_status(order)
                price = status.get("price", 0.0)
                logger.info("Using current price %s for closing trade", price)

            trade_info = {
                "cmd": close_cmd,
                "customComment": "Close trade",
                "expiration": 0,
                "offset": 0,
                "order": order,
                "price": price,
                "sl": 0.0,
                "symbol": symbol,
                "tp": 0.0,
                "type": TransactionType.ORDER_CLOSE,
                "volume": adjusted_volume
            }

            logger.info("Closing trade: %s", {
                **trade_info,
                "original_volume": volume,
                "adjusted_volume": adjusted_volume
            })

            response = self.client.commandExecute("tradeTransaction", {"tradeTransInfo": trade_info})
            if response.get("status"):
                close_order = response["returnData"]["order"]
                logger.info("✅ Trade closed successfully, closing order: %s", close_order)
                return close_order
            else:
                logger.error("❌ Trade close failed: %s", response)
                return None
        except Exception as e:
            logger.error("❌ Error closing trade: %s", str(e))
            return None

    def disconnect(self):
        """Disconnect from API."""
        if self.client:
            self.client.disconnect()
            logger.info("🔌 Disconnected from XTB API.")