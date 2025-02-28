
import logging
import time
import asyncio
from typing import Dict, Any, List, Optional, Tuple, Union
from threading import Timer
from .xtb_api import APIClient, loginCommand, getSymbolCommand, tradeTransactionCommand, tradeTransactionStatusCommand, getTradesCommand

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('XTB-Trader')

# Constants for trading operations
OPERATION_BUY = 0
OPERATION_SELL = 1
OPERATION_BUY_LIMIT = 2
OPERATION_SELL_LIMIT = 3
OPERATION_BUY_STOP = 4
OPERATION_SELL_STOP = 5
OPERATION_BALANCE = 6
OPERATION_CREDIT = 7

REQUEST_STATUS = {
    "ERROR": 0,
    "PENDING": 1,
    "ACCEPTED": 3,
    "REJECTED": 4
}

class XTBTrader:
    """High-level trader class for XTB trading operations"""
    
    def __init__(self, demo: bool = True):
        """Initialize the trader with API client"""
        self.client = None
        self.is_connected = False
        self.demo = demo
        
        # Server addresses for XTB API
        if demo:
            self.address = 'xapi.xtb.com'
            self.port = 5124  # Demo server port
        else:
            self.address = 'xapi.xtb.com'
            self.port = 5112  # Real server port
            
        self.reconnect_timer = None
        logger.info(f"Initialized XTB Trader for {'demo' if demo else 'live'} server")

    async def connect(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        """Connect to XTB API and login"""
        if self.reconnect_timer is not None:
            self.reconnect_timer.cancel()
            self.reconnect_timer = None
            
        logger.info("Attempting to connect to XTB")
        self.client = APIClient(address=self.address, port=self.port, encrypt=True)
        
        # Ensure we have credentials
        if not credentials.get("userId") or not credentials.get("password"):
            logger.error("Missing userId or password in credentials")
            return {"status": False, "errorCode": "MISSING_CREDENTIALS"}
        
        # Connect to the API
        if not self.client.connect():
            logger.error("Failed to connect to XTB API")
            return {"status": False, "errorCode": "CONNECTION_FAILED"}
        
        # Login to the trading account
        login_response = self.client.execute(loginCommand(
            userId=credentials.get("userId"),
            password=credentials.get("password"),
            appName="Hedgi"
        ))
        
        if login_response.get("status", False):
            self.is_connected = True
            logger.info("Successfully logged in to XTB")
            
            # Get the streaming session ID and start streaming
            stream_session_id = login_response.get("streamSessionId")
            if stream_session_id:
                if self.client.stream_session_start(stream_session_id):
                    logger.info("Streaming session started")
                else:
                    logger.warning("Failed to start streaming session")
            else:
                logger.warning("No streaming session ID received")
                
            return login_response
        else:
            logger.error(f"Login failed: {login_response.get('errorCode')} - {login_response.get('errorDescr')}")
            self.client.disconnect()
            self.client = None
            return login_response

    async def disconnect(self) -> None:
        """Disconnect from the API"""
        if self.client:
            self.client.stop()
            self.client = None
            self.is_connected = False
            logger.info("Disconnected from XTB API")

    async def reconnect(self, credentials: Dict[str, str], delay: int = 5) -> None:
        """Attempt to reconnect after a delay"""
        logger.info(f"Scheduling reconnect in {delay} seconds")

        async def do_reconnect():
            logger.info("Attempting to reconnect...")
            await self.disconnect()
            login_result = await self.connect(credentials)
            
            if not login_result.get("status", False):
                # If reconnect fails, schedule another attempt with increasing backoff
                next_delay = min(delay * 2, 300)  # Maximum 5 minutes
                await self.reconnect(credentials, next_delay)
            else:
                logger.info("Reconnected successfully")
                
        # Use asyncio.create_task to schedule the reconnection
        self.reconnect_timer = Timer(delay, lambda: asyncio.create_task(do_reconnect()))
        self.reconnect_timer.daemon = True
        self.reconnect_timer.start()

    async def check_trade_status(self, order: int) -> Dict[str, Any]:
        """Check the trade status."""
        if not self.is_connected or not self.client:
            logger.error("Not connected to XTB")
            return {"status": False, "errorCode": "NOT_CONNECTED"}
            
        response = self.client.execute(tradeTransactionStatusCommand(order))
        return response

    async def get_symbol_data(self, symbol: str) -> Dict[str, Any]:
        """Get data for a specific trading symbol"""
        if not self.is_connected or not self.client:
            logger.error("Not connected to XTB")
            return {"status": False, "errorCode": "NOT_CONNECTED"}
            
        response = self.client.execute(getSymbolCommand(symbol))
        if not response.get("status"):
            logger.error(f"Failed to get symbol data for {symbol}: {response}")
        return response

    async def execute_trade(self, symbol: str, operation: int, volume: float, 
                           comment: str = "", custom_comment: str = "", 
                           stop_loss: float = 0.0, take_profit: float = 0.0) -> Dict[str, Any]:
        """Execute a trade with the specified parameters"""
        if not self.is_connected or not self.client:
            logger.error("Not connected to XTB")
            return {"status": False, "errorCode": "NOT_CONNECTED"}
            
        # Get current symbol data to get the price
        symbol_data = await self.get_symbol_data(symbol)
        if not symbol_data.get("status"):
            return symbol_data
            
        # Determine price based on operation type
        symbol_info = symbol_data.get("returnData", {})
        if operation == OPERATION_BUY:
            price = symbol_info.get("ask", 0.0)
        elif operation == OPERATION_SELL:
            price = symbol_info.get("bid", 0.0)
        else:
            # For limit and stop orders, price should be provided
            logger.error("Limit and stop orders require explicit price")
            return {"status": False, "errorCode": "INVALID_OPERATION_TYPE"}
            
        if price <= 0:
            logger.error(f"Invalid price for {symbol}: {price}")
            return {"status": False, "errorCode": "INVALID_PRICE"}
            
        # Execute trade transaction
        response = self.client.execute(tradeTransactionCommand(
            symbol=symbol,
            operation=operation,
            price=price,
            volume=volume,
            comment=comment,
            customComment=custom_comment,
            sl=stop_loss,
            tp=take_profit
        ))
        
        if response.get("status"):
            order = response.get("returnData", {}).get("order", 0)
            logger.info(f"Trade executed successfully. Order ID: {order}")
            
            # Check trade status (optional)
            status_response = await self.check_trade_status(order)
            if status_response.get("status"):
                status_info = status_response.get("returnData", {})
                status_code = status_info.get("requestStatus", 0)
                logger.info(f"Trade status: {status_code}")
                
                # Combine response data
                response["returnData"]["statusInfo"] = status_info
        else:
            logger.error(f"Trade execution failed: {response}")
            
        return response

    async def get_open_trades(self) -> Dict[str, Any]:
        """Get all currently open trades"""
        if not self.is_connected or not self.client:
            logger.error("Not connected to XTB")
            return {"status": False, "errorCode": "NOT_CONNECTED"}
            
        response = self.client.execute(getTradesCommand(opened_only=True))
        if not response.get("status"):
            logger.error(f"Failed to get open trades: {response}")
        return response

    async def close_trade(self, trade_id: int, volume: float = 0) -> Dict[str, Any]:
        """Close an open trade"""
        if not self.is_connected or not self.client:
            logger.error("Not connected to XTB")
            return {"status": False, "errorCode": "NOT_CONNECTED"}
            
        # Get open trades to find the one to close
        trades_response = await self.get_open_trades()
        if not trades_response.get("status"):
            return trades_response
            
        trades = trades_response.get("returnData", [])
        trade_to_close = None
        for trade in trades:
            if trade.get("position") == trade_id:
                trade_to_close = trade
                break
                
        if not trade_to_close:
            logger.error(f"Trade with ID {trade_id} not found")
            return {"status": False, "errorCode": "TRADE_NOT_FOUND"}
            
        # Determine closing operation (opposite of opening operation)
        symbol = trade_to_close.get("symbol")
        original_operation = trade_to_close.get("cmd")
        close_operation = OPERATION_SELL if original_operation == OPERATION_BUY else OPERATION_BUY
        
        # Use provided volume or full trade volume
        if volume <= 0:
            volume = trade_to_close.get("volume")
            
        # Execute the closing trade
        return await self.execute_trade(
            symbol=symbol,
            operation=close_operation,
            volume=volume,
            comment=f"Close position {trade_id}"
        )

    def subscribe_to_prices(self, symbol: str, callback: callable) -> bool:
        """Subscribe to real-time price updates for a symbol"""
        if not self.is_connected or not self.client:
            logger.error("Not connected to XTB")
            return False
            
        return self.client.stream_subscribe("tickPrices", symbol, callback)

    def subscribe_to_trades(self, callback: callable) -> bool:
        """Subscribe to real-time trade updates"""
        if not self.is_connected or not self.client:
            logger.error("Not connected to XTB")
            return False
            
        return self.client.stream_subscribe("trade", "TRADE_STATUS", callback)
