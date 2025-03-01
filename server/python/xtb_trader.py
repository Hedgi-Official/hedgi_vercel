
import logging
import json
from typing import Dict, Any, List, Optional
from .xtb_api import xtb_client

logger = logging.getLogger("xtb_trader")

class XTBTrader:
    def __init__(self):
        self.api = xtb_client
    
    def connect(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to XTB API with provided credentials"""
        user_id = credentials.get("userId")
        password = credentials.get("password")
        app_name = credentials.get("appName", "Hedgi")
        
        if not user_id or not password:
            return {"success": False, "error": "Missing credentials"}
        
        return self.api.connect(user_id, password, app_name)
    
    def disconnect(self) -> Dict[str, Any]:
        """Disconnect from XTB API"""
        return self.api.disconnect()
    
    def get_status(self) -> Dict[str, Any]:
        """Get connection status"""
        return self.api.check_connection()
    
    def get_symbol_info(self, symbol: str) -> Dict[str, Any]:
        """Get detailed information about a symbol"""
        return self.api.get_symbol_info(symbol)
    
    def get_currency_pairs(self) -> Dict[str, Any]:
        """Get all available currency pairs"""
        response = self.api.get_all_symbols()
        
        if not response.get("success", False):
            return response
        
        # Filter for currency pairs only (assumes symbols follow the standard format)
        symbols_data = response.get("data", {}).get("returnData", [])
        currency_pairs = [
            symbol for symbol in symbols_data 
            if len(symbol.get("symbol", "")) == 6 and 
            symbol.get("categoryName", "") == "FX"
        ]
        
        return {
            "success": True,
            "data": {
                "pairs": currency_pairs
            }
        }
    
    def place_trade(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Place a trade with XTB
        
        trade_data should include:
        - symbol: str (e.g., "EURUSD")
        - cmd: int (0 for BUY, 1 for SELL)
        - volume: float (trade size in lots)
        - comment: str (optional)
        - tp: float (take profit, optional)
        - sl: float (stop loss, optional)
        """
        if not self.api.check_connection().get("connected", False):
            return {"success": False, "error": "Not connected to XTB API"}
        
        # Validate required fields
        required_fields = ["symbol", "cmd", "volume"]
        for field in required_fields:
            if field not in trade_data:
                return {"success": False, "error": f"Missing required field: {field}"}
        
        # Prepare transaction info
        transaction_info = {
            "cmd": trade_data["cmd"],
            "symbol": trade_data["symbol"],
            "volume": float(trade_data["volume"]),
            "type": 0,  # Market order
            "price": 0.0,  # Market price
            "sl": trade_data.get("sl", 0.0),
            "tp": trade_data.get("tp", 0.0),
            "customComment": trade_data.get("comment", "Hedgi Platform Trade"),
        }
        
        # Execute trade
        response = self.api.trade_transaction(transaction_info)
        
        if response.get("success", False):
            # If successful, extract the order number for status checking
            return_data = response.get("data", {}).get("returnData", {})
            order = return_data.get("order", None)
            
            if order:
                return {
                    "success": True,
                    "data": {
                        "order": order,
                        "status": "pending",
                        "message": "Trade submitted successfully"
                    }
                }
        
        return response
    
    def check_trade_status(self, order_id: int) -> Dict[str, Any]:
        """Check the status of a trade by order ID"""
        if not self.api.check_connection().get("connected", False):
            return {"success": False, "error": "Not connected to XTB API"}
        
        response = self.api.trade_transaction_status(order_id)
        
        if response.get("success", False):
            # Map XTB status codes to readable status
            status_map = {
                0: "ERROR",
                1: "PENDING",
                3: "ACCEPTED", 
                4: "REJECTED"
            }
            
            return_data = response.get("data", {}).get("returnData", {})
            status_code = return_data.get("requestStatus", 0)
            
            return {
                "success": True,
                "data": {
                    "order": order_id,
                    "status": status_map.get(status_code, "UNKNOWN"),
                    "statusCode": status_code,
                    "message": return_data.get("message", ""),
                    "customComment": return_data.get("customComment", "")
                }
            }
        
        return response
    
    def get_open_trades(self) -> Dict[str, Any]:
        """Get all open trades"""
        return self.api.get_trades(opened_only=True)
    
    def close_trade(self, position_id: int) -> Dict[str, Any]:
        """Close an open trade by position ID"""
        if not self.api.check_connection().get("connected", False):
            return {"success": False, "error": "Not connected to XTB API"}
        
        # First, get the trade details to prepare close transaction
        trades_response = self.api.get_trades(opened_only=True)
        
        if not trades_response.get("success", False):
            return trades_response
        
        trades = trades_response.get("data", {}).get("returnData", [])
        target_trade = None
        
        for trade in trades:
            if trade.get("position", 0) == position_id:
                target_trade = trade
                break
        
        if not target_trade:
            return {"success": False, "error": f"Trade with position ID {position_id} not found"}
        
        # Prepare close transaction
        transaction_info = {
            "cmd": 0 if target_trade.get("cmd", 0) == 1 else 1,  # Opposite direction
            "symbol": target_trade.get("symbol"),
            "volume": target_trade.get("volume"),
            "type": 2,  # Close position
            "price": 0.0,  # Market price
            "position": position_id
        }
        
        # Execute close transaction
        return self.api.trade_transaction(transaction_info)

# Create a singleton instance
xtb_trader = XTBTrader()
