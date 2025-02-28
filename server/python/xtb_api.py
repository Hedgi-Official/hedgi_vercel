
import json
import socket
import logging
import time
import ssl
from threading import Thread, Lock
import datetime
from typing import Dict, Any, Optional, Union, List, Callable

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('XTB-API')

# Constants
STREAM_DEPTH_MAX_WAIT = 20

class APIClient:
    """XTB API Client implementation - handles the connection and command execution"""
    
    def __init__(self, address='xapi.xtb.com', port=5124, encrypt=True):
        self.address = address
        self.port = port
        self.encrypt = encrypt
        
        self.sock = None
        self.stream_socket = None
        self.stream_session_id = None
        
        self.mutex = Lock()
        self.stream_mutex = Lock()
        self.timeout = 10.0  # socket timeout in seconds
        
        self.stream_subscriptions = {}
        self.stream_subscribers = {}
        self.callback_thread = None
        self.running = False
        
        logger.info(f"Initialized API client for {self.address}:{self.port}")

    def connect(self) -> bool:
        """Establishes the connection to the trading server"""
        if self.sock:
            logger.warning("Connection already established")
            return True
            
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            
            if self.encrypt:
                ctx = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                sock = ctx.wrap_socket(sock)
            
            logger.info(f"Connecting to {self.address}:{self.port}")
            sock.connect((self.address, self.port))
            self.sock = sock
            return True
            
        except (socket.error, ssl.SSLError) as e:
            logger.error(f"Connection error: {e}")
            return False

    def disconnect(self) -> None:
        """Closes the connection to the trading server"""
        if self.sock:
            self.sock.close()
            self.sock = None
            logger.info("Disconnected from trading server")

    def execute(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Executes a trading command"""
        if not self.sock:
            if not self.connect():
                return {"status": False, "errorCode": "NOT_CONNECTED"}
        
        try:
            with self.mutex:
                cmd = json.dumps(command)
                data = cmd.encode('utf-8')
                
                # Send command length followed by the command itself
                self.sock.send(len(data).to_bytes(4, byteorder='little'))
                self.sock.send(data)
                
                # Receive the response
                header = self.sock.recv(4)
                size = int.from_bytes(header, byteorder='little')
                
                response_data = b""
                while len(response_data) < size:
                    packet = self.sock.recv(size - len(response_data))
                    if not packet:
                        break
                    response_data += packet
                
                if response_data:
                    response = json.loads(response_data.decode('utf-8'))
                    logger.debug(f"Response: {response}")
                    return response
                else:
                    logger.error("Empty response received")
                    return {"status": False, "errorCode": "EMPTY_RESPONSE"}
                    
        except (socket.error, ssl.SSLError) as e:
            logger.error(f"Socket error during command execution: {e}")
            self.disconnect()
            return {"status": False, "errorCode": "SOCKET_ERROR", "errorDescr": str(e)}
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}, data: {response_data}")
            return {"status": False, "errorCode": "JSON_DECODE_ERROR", "errorDescr": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error during command execution: {e}")
            return {"status": False, "errorCode": "EXECUTION_ERROR", "errorDescr": str(e)}

    def stream_connect(self) -> bool:
        """Establishes a separate connection for streaming data"""
        if self.stream_socket:
            logger.warning("Stream connection already established")
            return True
            
        try:
            stream_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            stream_socket.settimeout(self.timeout)
            
            if self.encrypt:
                ctx = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                stream_socket = ctx.wrap_socket(stream_socket)
            
            logger.info(f"Connecting to streaming server at {self.address}:{self.port}")
            stream_socket.connect((self.address, self.port))
            self.stream_socket = stream_socket
            return True
            
        except (socket.error, ssl.SSLError) as e:
            logger.error(f"Stream connection error: {e}")
            return False

    def stream_disconnect(self) -> None:
        """Closes the streaming connection"""
        if self.stream_socket:
            self.stream_socket.close()
            self.stream_socket = None
            self.stream_session_id = None
            logger.info("Disconnected from streaming server")

    def stream_session_start(self, session_id: str) -> bool:
        """Starts a streaming session with the given session ID"""
        if not self.stream_connect():
            return False
            
        self.stream_session_id = session_id
        logger.info(f"Started streaming session with ID: {session_id}")
        
        # Start the callback thread if it's not already running
        if not self.callback_thread or not self.callback_thread.is_alive():
            self.running = True
            self.callback_thread = Thread(target=self._stream_listener_thread)
            self.callback_thread.daemon = True
            self.callback_thread.start()
            
        return True

    def stream_subscribe(self, stream_name: str, symbol: str, callback: Callable[[Dict[str, Any]], None]) -> bool:
        """Subscribes to a data stream for a specific symbol"""
        if not self.stream_session_id:
            logger.error("Cannot subscribe: No streaming session active")
            return False
            
        # Structure to keep track of subscription status
        subscription_key = f"{stream_name}_{symbol}"
        if subscription_key not in self.stream_subscriptions:
            self.stream_subscriptions[subscription_key] = {"status": "subscribing", "timestamp": time.time()}
            
            command = {
                "command": "getTickPrices" if stream_name == "tickPrices" else stream_name,
                "streamSessionId": self.stream_session_id,
                "symbol": symbol,
                "minArrivalTime": 500,  # ms
            }
            
            # Register the callback
            if subscription_key not in self.stream_subscribers:
                self.stream_subscribers[subscription_key] = []
            self.stream_subscribers[subscription_key].append(callback)
            
            try:
                with self.stream_mutex:
                    cmd = json.dumps(command)
                    data = cmd.encode('utf-8')
                    
                    self.stream_socket.send(len(data).to_bytes(4, byteorder='little'))
                    self.stream_socket.send(data)
                    
                logger.info(f"Subscribed to {stream_name} for {symbol}")
                return True
                
            except (socket.error, ssl.SSLError) as e:
                logger.error(f"Socket error during stream subscription: {e}")
                self.stream_disconnect()
                return False
        else:
            # Already subscribed, just add the callback
            if subscription_key not in self.stream_subscribers:
                self.stream_subscribers[subscription_key] = []
            self.stream_subscribers[subscription_key].append(callback)
            return True

    def _stream_listener_thread(self) -> None:
        """Background thread to listen for streaming data and dispatch to callbacks"""
        logger.info("Stream listener thread started")
        
        while self.running and self.stream_socket and self.stream_session_id:
            try:
                header = self.stream_socket.recv(4)
                if not header:
                    logger.warning("Stream connection closed by server")
                    break
                    
                size = int.from_bytes(header, byteorder='little')
                data = b""
                
                while len(data) < size:
                    packet = self.stream_socket.recv(size - len(data))
                    if not packet:
                        break
                    data += packet
                
                if data:
                    response = json.loads(data.decode('utf-8'))
                    if "command" in response and "data" in response:
                        command = response["command"]
                        symbol = response["data"].get("symbol", "")
                        
                        subscription_key = f"{command}_{symbol}"
                        
                        # Update subscription status
                        if subscription_key in self.stream_subscriptions:
                            self.stream_subscriptions[subscription_key]["status"] = "active"
                            self.stream_subscriptions[subscription_key]["last_update"] = time.time()
                        
                        # Dispatch to all registered callbacks
                        if subscription_key in self.stream_subscribers:
                            for callback in self.stream_subscribers[subscription_key]:
                                try:
                                    callback(response["data"])
                                except Exception as e:
                                    logger.error(f"Error in stream callback: {e}")
                    else:
                        logger.warning(f"Received unexpected streaming data: {response}")
                        
            except (socket.error, ssl.SSLError) as e:
                logger.error(f"Socket error in stream listener: {e}")
                break
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error in stream: {e}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error in stream listener: {e}")
                continue
        
        logger.info("Stream listener thread stopped")
        self.running = False
        self.stream_disconnect()

    def stop(self) -> None:
        """Stops all connections and threads"""
        self.running = False
        if self.callback_thread and self.callback_thread.is_alive():
            self.callback_thread.join(timeout=2.0)
        self.stream_disconnect()
        self.disconnect()
        logger.info("API client stopped")


# Helper functions for common commands

def loginCommand(userId: str, password: str, appName: str = "Hedgi") -> Dict[str, Any]:
    """Creates a login command"""
    return {
        "command": "login",
        "arguments": {
            "userId": userId,
            "password": password,
            "appName": appName
        }
    }

def logoutCommand() -> Dict[str, Any]:
    """Creates a logout command"""
    return {
        "command": "logout"
    }

def getAllSymbolsCommand() -> Dict[str, Any]:
    """Creates a command to get all available symbols"""
    return {
        "command": "getAllSymbols"
    }

def getSymbolCommand(symbol: str) -> Dict[str, Any]:
    """Creates a command to get information about a specific symbol"""
    return {
        "command": "getSymbol",
        "arguments": {
            "symbol": symbol
        }
    }

def getTickPricesCommand(symbols: List[str], timestamp: int = 0) -> Dict[str, Any]:
    """Creates a command to get tick prices for specified symbols"""
    return {
        "command": "getTickPrices",
        "arguments": {
            "symbols": symbols,
            "timestamp": timestamp
        }
    }

def tradeTransactionCommand(symbol: str, operation: int, price: float, volume: float, 
                           comment: str = "", customComment: str = "", sl: float = 0.0, tp: float = 0.0) -> Dict[str, Any]:
    """Creates a command to execute a trade transaction"""
    return {
        "command": "tradeTransaction",
        "arguments": {
            "tradeTransInfo": {
                "cmd": operation,
                "symbol": symbol,
                "price": price,
                "volume": volume,
                "sl": sl,
                "tp": tp,
                "type": 0,  # OPEN
                "comment": comment,
                "customComment": customComment
            }
        }
    }

def tradeTransactionStatusCommand(order: int) -> Dict[str, Any]:
    """Creates a command to check the status of a transaction"""
    return {
        "command": "tradeTransactionStatus",
        "arguments": {
            "order": order
        }
    }

def getTradesCommand(opened_only: bool = True) -> Dict[str, Any]:
    """Creates a command to get all trades"""
    return {
        "command": "getTrades",
        "arguments": {
            "openedOnly": opened_only
        }
    }
