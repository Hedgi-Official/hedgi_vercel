
import asyncio
import os
import json
import logging
from typing import Dict, Any, List
from .xtb_trader import XTBTrader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('XTB-Main')

# Global variables
trader = None
credentials = None
price_updates = {}

async def init_trader() -> XTBTrader:
    """Initialize the XTB trader with credentials"""
    global trader, credentials
    
    # Create the trader instance
    if trader is None:
        trader = XTBTrader(demo=True)  # Use demo server by default
    
    # Get credentials from environment variables
    if credentials is None:
        credentials = {
            "userId": os.environ.get("XTB_USER_ID", "17535100"),
            "password": os.environ.get("XTB_PASSWORD", "GuiZarHoh2711!"),
        }
    
    # Connect to XTB
    if not trader.is_connected:
        logger.info("Connecting to XTB...")
        connect_result = await trader.connect(credentials)
        
        if not connect_result.get("status", False):
            logger.error(f"Failed to connect: {connect_result}")
            return None
    
    return trader

async def get_symbol_data(symbol: str) -> Dict[str, Any]:
    """Get data for a specific symbol"""
    trader_instance = await init_trader()
    if not trader_instance:
        return {"status": False, "error": "Failed to initialize trader"}
    
    try:
        response = await trader_instance.get_symbol_data(symbol)
        return response
    except Exception as e:
        logger.error(f"Error getting symbol data: {e}")
        return {"status": False, "error": str(e)}

async def execute_trade(symbol: str, operation: int, volume: float, 
                       comment: str = "", custom_comment: str = "", 
                       stop_loss: float = 0.0, take_profit: float = 0.0) -> Dict[str, Any]:
    """Execute a trade with the specified parameters"""
    trader_instance = await init_trader()
    if not trader_instance:
        return {"status": False, "error": "Failed to initialize trader"}
    
    try:
        response = await trader_instance.execute_trade(
            symbol=symbol,
            operation=operation,
            volume=volume,
            comment=comment,
            custom_comment=custom_comment,
            stop_loss=stop_loss,
            take_profit=take_profit
        )
        return response
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        return {"status": False, "error": str(e)}

async def get_open_trades() -> Dict[str, Any]:
    """Get all currently open trades"""
    trader_instance = await init_trader()
    if not trader_instance:
        return {"status": False, "error": "Failed to initialize trader"}
    
    try:
        response = await trader_instance.get_open_trades()
        return response
    except Exception as e:
        logger.error(f"Error getting open trades: {e}")
        return {"status": False, "error": str(e)}

async def close_trade(trade_id: int, volume: float = 0) -> Dict[str, Any]:
    """Close an open trade"""
    trader_instance = await init_trader()
    if not trader_instance:
        return {"status": False, "error": "Failed to initialize trader"}
    
    try:
        response = await trader_instance.close_trade(trade_id, volume)
        return response
    except Exception as e:
        logger.error(f"Error closing trade: {e}")
        return {"status": False, "error": str(e)}

def subscribe_to_prices(symbol: str) -> bool:
    """Subscribe to real-time price updates for a symbol"""
    global trader, price_updates
    
    if not trader or not trader.is_connected:
        logger.error("Trader not initialized or not connected")
        return False
    
    def price_callback(data: Dict[str, Any]) -> None:
        """Callback function for price updates"""
        symbol = data.get("symbol", "")
        price_updates[symbol] = {
            "bid": data.get("bid", 0.0),
            "ask": data.get("ask", 0.0),
            "timestamp": data.get("timestamp", 0),
        }
        logger.debug(f"Price update for {symbol}: bid={data.get('bid')}, ask={data.get('ask')}")
    
    return trader.subscribe_to_prices(symbol, price_callback)

def get_latest_prices() -> Dict[str, Dict[str, Any]]:
    """Get the latest price updates for all subscribed symbols"""
    global price_updates
    return price_updates

async def disconnect() -> None:
    """Disconnect from XTB API"""
    global trader
    if trader and trader.is_connected:
        await trader.disconnect()
        logger.info("Disconnected from XTB")

# If this module is run directly, execute a simple test
if __name__ == "__main__":
    async def main():
        try:
            # Initialize the trader
            trader_instance = await init_trader()
            if not trader_instance:
                logger.error("Failed to initialize trader")
                return
            
            # Get symbol data
            usdbrl = await get_symbol_data("USDBRL")
            if usdbrl.get("status"):
                logger.info(f"USDBRL data: {json.dumps(usdbrl.get('returnData', {}), indent=2)}")
            
            # Subscribe to price updates
            if subscribe_to_prices("USDBRL"):
                logger.info("Subscribed to USDBRL price updates")
            
            # Wait for some price updates
            await asyncio.sleep(5)
            
            # Get and print the latest prices
            latest_prices = get_latest_prices()
            logger.info(f"Latest prices: {json.dumps(latest_prices, indent=2)}")
            
            # Disconnect when done
            await disconnect()
            
        except Exception as e:
            logger.error(f"Error in main function: {e}")
            await disconnect()
    
    # Run the async main function
    asyncio.run(main())
