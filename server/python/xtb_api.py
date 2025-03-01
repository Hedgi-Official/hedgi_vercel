
import json
import logging
import time
from threading import Thread, Timer
import sys
import os

# Add the attached_assets directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../attached_assets'))

# Import the XTB API connector
from xAPIConnector import APIClient, APIStreamClient, loginCommand

# Configure logging
logger = logging.getLogger("xtb_api")
logging.basicConfig(level=logging.INFO, format='[%(asctime)-15s][%(name)s][%(levelname)s] %(message)s')

class XTBClient:
    def __init__(self):
        self.client = None
        self.stream_client = None
        self.stream_session_id = None
        self.connected = False
        self.callbacks = {}

    def connect(self, user_id, password, app_name="Hedgi"):
        """Connect to XTB API and return login response"""
        try:
            # Create and connect to API client
            self.client = APIClient(address="xapi.xtb.com", port=5124, encrypt=True)
            
            # Login to the API
            login_response = self.client.execute(loginCommand(userId=user_id, password=password, appName=app_name))
            logger.info(f"Login response status: {login_response.get('status', False)}")
            
            if login_response.get('status', False):
                self.connected = True
                self.stream_session_id = login_response.get('streamSessionId')
                return {"success": True, "data": login_response}
            else:
                error_code = login_response.get('errorCode', 'unknown')
                error_desc = login_response.get('errorDescr', 'Unknown error')
                logger.error(f"Login failed. Error code: {error_code}, Description: {error_desc}")
                return {"success": False, "error": error_desc, "code": error_code}
                
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def disconnect(self):
        """Disconnect from XTB API"""
        try:
            if self.stream_client:
                self.stream_client.disconnect()
                self.stream_client = None
            
            if self.client:
                self.client.disconnect()
                self.client = None
                
            self.connected = False
            self.stream_session_id = None
            return {"success": True}
        except Exception as e:
            logger.error(f"Disconnection error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def check_connection(self):
        """Check if connected to XTB API"""
        return {"success": True, "connected": self.connected}
    
    def execute_command(self, command_name, arguments=None):
        """Execute a command on the XTB API"""
        if not self.connected or not self.client:
            return {"success": False, "error": "Not connected to XTB API"}
        
        try:
            response = self.client.commandExecute(command_name, arguments)
            return {"success": True, "data": response}
        except Exception as e:
            logger.error(f"Command execution error ({command_name}): {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_symbol_info(self, symbol):
        """Get information about a symbol"""
        return self.execute_command("getSymbol", {"symbol": symbol})
    
    def get_all_symbols(self):
        """Get all available symbols"""
        return self.execute_command("getAllSymbols")
    
    def trade_transaction(self, transaction_info):
        """Execute a trade transaction"""
        return self.execute_command("tradeTransaction", {"tradeTransInfo": transaction_info})
    
    def trade_transaction_status(self, order_id):
        """Get the status of a trade transaction"""
        return self.execute_command("tradeTransactionStatus", {"order": order_id})
    
    def get_trades(self, opened_only=True):
        """Get trades"""
        return self.execute_command("getTrades", {"openedOnly": opened_only})
    
    def get_trading_hours(self, symbols=None):
        """Get trading hours for symbols"""
        return self.execute_command("getTradingHours", {"symbols": symbols})
    
    def get_version(self):
        """Get XTB API version"""
        return self.execute_command("getVersion")
    
    def ping(self):
        """Ping XTB API to keep connection alive"""
        return self.execute_command("ping")

# Create a singleton instance
xtb_client = XTBClient()
