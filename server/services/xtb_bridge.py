
import logging
import json
import time
import socket
import ssl
import asyncio
from threading import Timer, Thread
from typing import Dict, Any, Optional, List, Callable

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("xtb_bridge")

# Default connection properties
DEFAULT_XAPI_ADDRESS = 'xapia.x-station.eu'
DEFAULT_XAPI_PORT = 5124
DEFAULT_XAPI_STREAMING_PORT = 5125

# API settings
API_SEND_TIMEOUT = 100  # ms
API_MAX_CONN_TRIES = 3

# Command templates
def baseCommand(commandName, arguments=None):
    if arguments is None:
        arguments = dict()
    return dict([('command', commandName), ('arguments', arguments)])

def loginCommand(userId, password, appName=''):
    return baseCommand('login', dict(userId=userId, password=password, appName=appName))

class JsonSocket:
    def __init__(self, address, port, encrypt=False):
        self._ssl = encrypt
        if self._ssl != True:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        else:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket = ssl.wrap_socket(sock)
        self.conn = self.socket
        self._timeout = None
        self._address = address
        self._port = port
        self._decoder = json.JSONDecoder()
        self._receivedData = ''

    def connect(self):
        for i in range(API_MAX_CONN_TRIES):
            try:
                self.socket.connect((self.address, self.port))
            except socket.error as msg:
                logger.error(f"SockThread Error: {msg}")
                time.sleep(0.25)
                continue
            logger.info("Socket connected")
            return True
        return False

    def _sendObj(self, obj):
        msg = json.dumps(obj)
        self._waitingSend(msg)

    def _waitingSend(self, msg):
        if self.socket:
            sent = 0
            msg = msg.encode('utf-8')
            while sent < len(msg):
                sent += self.conn.send(msg[sent:])
                logger.info(f'Sent: {msg}')
                time.sleep(API_SEND_TIMEOUT / 1000)

    def _read(self, bytesSize=4096):
        if not self.socket:
            raise RuntimeError("socket connection broken")
        while True:
            char = self.conn.recv(bytesSize).decode()
            self._receivedData += char
            try:
                (resp, size) = self._decoder.raw_decode(self._receivedData)
                if size == len(self._receivedData):
                    self._receivedData = ''
                    break
                elif size < len(self._receivedData):
                    self._receivedData = self._receivedData[size:].strip()
                    break
            except ValueError as e:
                continue
        logger.info(f'Received: {resp}')
        return resp

    def _readObj(self):
        msg = self._read()
        return msg

    def close(self):
        logger.debug("Closing socket")
        self._closeSocket()
        if self.socket is not self.conn:
            logger.debug("Closing connection socket")
            self._closeConnection()

    def _closeSocket(self):
        self.socket.close()

    def _closeConnection(self):
        self.conn.close()

    def _get_timeout(self):
        return self._timeout

    def _set_timeout(self, timeout):
        self._timeout = timeout
        self.socket.settimeout(timeout)

    def _get_address(self):
        return self._address

    def _set_address(self, address):
        pass

    def _get_port(self):
        return self._port

    def _set_port(self, port):
        pass

    def _get_encrypt(self):
        return self._ssl

    def _set_encrypt(self, encrypt):
        pass

    timeout = property(_get_timeout, _set_timeout, doc='Get/set the socket timeout')
    address = property(_get_address, _set_address, doc='read only property socket address')
    port = property(_get_port, _set_port, doc='read only property socket port')
    encrypt = property(_get_encrypt, _set_encrypt, doc='read only property socket port')


class APIClient(JsonSocket):
    def __init__(self, address=DEFAULT_XAPI_ADDRESS, port=DEFAULT_XAPI_PORT, encrypt=True):
        super(APIClient, self).__init__(address, port, encrypt)
        if not self.connect():
            raise Exception(f"Cannot connect to {address}:{port} after {API_MAX_CONN_TRIES} retries")

    def execute(self, dictionary):
        self._sendObj(dictionary)
        return self._readObj()

    def disconnect(self):
        self.close()

    def commandExecute(self, commandName, arguments=None):
        return self.execute(baseCommand(commandName, arguments))


class APIStreamClient(JsonSocket):
    def __init__(self, address=DEFAULT_XAPI_ADDRESS, port=DEFAULT_XAPI_STREAMING_PORT, encrypt=True, ssId=None,
                 tickFun=None, tradeFun=None, balanceFun=None, tradeStatusFun=None, profitFun=None, newsFun=None):
        super(APIStreamClient, self).__init__(address, port, encrypt)
        self._ssId = ssId
        self._tickFun = tickFun
        self._tradeFun = tradeFun
        self._balanceFun = balanceFun
        self._tradeStatusFun = tradeStatusFun
        self._profitFun = profitFun
        self._newsFun = newsFun

        if not self.connect():
            raise Exception(f"Cannot connect to streaming on {address}:{port} after {API_MAX_CONN_TRIES} retries")

        self._running = True
        self._t = Thread(target=self._readStream, args=())
        self._t.setDaemon(True)
        self._t.start()

    def _readStream(self):
        while self._running:
            try:
                msg = self._readObj()
                logger.info(f"Stream received: {msg}")
                if msg.get("command") == 'tickPrices' and self._tickFun:
                    self._tickFun(msg)
                elif msg.get("command") == 'trade' and self._tradeFun:
                    self._tradeFun(msg)
                elif msg.get("command") == "balance" and self._balanceFun:
                    self._balanceFun(msg)
                elif msg.get("command") == "tradeStatus" and self._tradeStatusFun:
                    self._tradeStatusFun(msg)
                elif msg.get("command") == "profit" and self._profitFun:
                    self._profitFun(msg)
                elif msg.get("command") == "news" and self._newsFun:
                    self._newsFun(msg)
            except Exception as e:
                logger.error(f"Error in stream reading: {e}")
                time.sleep(1)

    def disconnect(self):
        self._running = False
        if hasattr(self, '_t') and self._t.is_alive():
            self._t.join()
        self.close()

    def execute(self, dictionary):
        self._sendObj(dictionary)

    def subscribePrice(self, symbol):
        self.execute(dict(command='getTickPrices', symbol=symbol, streamSessionId=self._ssId))

    def subscribePrices(self, symbols):
        for symbolX in symbols:
            self.subscribePrice(symbolX)

    def subscribeTrades(self):
        self.execute(dict(command='getTrades', streamSessionId=self._ssId))

    def subscribeBalance(self):
        self.execute(dict(command='getBalance', streamSessionId=self._ssId))

    def subscribeTradeStatus(self):
        self.execute(dict(command='getTradeStatus', streamSessionId=self._ssId))

    def subscribeProfits(self):
        self.execute(dict(command='getProfits', streamSessionId=self._ssId))

    def subscribeNews(self):
        self.execute(dict(command='getNews', streamSessionId=self._ssId))

    def unsubscribePrice(self, symbol):
        self.execute(dict(command='stopTickPrices', symbol=symbol, streamSessionId=self._ssId))

    def unsubscribePrices(self, symbols):
        for symbolX in symbols:
            self.unsubscribePrice(symbolX)

    def unsubscribeTrades(self):
        self.execute(dict(command='stopTrades', streamSessionId=self._ssId))

    def unsubscribeBalance(self):
        self.execute(dict(command='stopBalance', streamSessionId=self._ssId))

    def unsubscribeTradeStatus(self):
        self.execute(dict(command='stopTradeStatus', streamSessionId=self._ssId))

    def unsubscribeProfits(self):
        self.execute(dict(command='stopProfits', streamSessionId=self._ssId))

    def unsubscribeNews(self):
        self.execute(dict(command='stopNews', streamSessionId=self._ssId))


class XTBBridge:
    def __init__(self):
        self.client: Optional[APIClient] = None
        self.stream_client: Optional[APIStreamClient] = None
        self.connected = False
        self.ssid = None
        self.reconnect_timer = None

    async def connect(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        """Establish connection and log in."""
        try:
            if self.reconnect_timer:
                self.reconnect_timer.cancel()
                self.reconnect_timer = None
                
            logger.info("Attempting to connect to XTB")
            
            # Use XTB demo server - the same URL used in the Express server
            self.client = APIClient(address="xapia.x-station.eu", port=5124, encrypt=True)
            
            # Ensure we have credentials
            if not credentials.get("userId") or not credentials.get("password"):
                return {
                    "success": False,
                    "error": "Missing userId or password"
                }
                
            # Try to login
            userId = credentials.get("userId", "17535100")
            password = credentials.get("password", "GuiZarHoh2711!")
            
            logger.info(f"Attempting login with user ID: {userId}")
            login_response = self.client.execute(loginCommand(
                userId=userId,
                password=password,
                appName="Hedgi"
            ))

            if login_response.get("status"):
                logger.info("✅ Logged in successfully!")
                self.ssid = login_response.get("streamSessionId")
                logger.info(f"🔗 Stream session ID: {self.ssid}")
                self.connected = True
                
                # Setup streaming if needed
                if not self.stream_client:
                    self._setup_streaming()
                
                return {
                    "success": True,
                    "sessionId": self.ssid
                }
            else:
                logger.error(f"❌ Login failed: {login_response}")
                return {
                    "success": False,
                    "error": login_response.get("errorDescr", "Unknown error")
                }
                
        except Exception as e:
            logger.exception(f"Connection error: {e}")
            await self.schedule_reconnect()
            return {
                "success": False,
                "error": str(e)
            }

    def _setup_streaming(self):
        """Setup streaming connection after successful login"""
        try:
            if not self.ssid:
                logger.error("Cannot setup streaming without session ID")
                return
                
            # Callback functions for different stream events
            def tick_callback(msg):
                logger.info(f"Tick received: {msg}")
                
            def trade_callback(msg):
                logger.info(f"Trade event: {msg}")
                
            def balance_callback(msg):
                logger.info(f"Balance update: {msg}")
                
            def status_callback(msg):
                logger.info(f"Trade status: {msg}")
                
            # Setup streaming client
            self.stream_client = APIStreamClient(
                address=DEFAULT_XAPI_ADDRESS,
                port=DEFAULT_XAPI_STREAMING_PORT,
                encrypt=True,
                ssId=self.ssid,
                tickFun=tick_callback,
                tradeFun=trade_callback,
                balanceFun=balance_callback,
                tradeStatusFun=status_callback
            )
            logger.info("Successfully connected to streaming API")
            
            # Subscribe to updates for some common symbols
            symbols = ["EURUSD", "USDJPY", "GBPUSD", "USDCHF", "USDBRL", "USDMXN"]
            self.stream_client.subscribePrices(symbols)
            self.stream_client.subscribeTrades()
            self.stream_client.subscribeBalance()
            self.stream_client.subscribeTradeStatus()
            
            logger.info(f"Subscribed to price updates for {symbols}")
            
        except Exception as e:
            logger.exception(f"Streaming setup error: {e}")

    async def schedule_reconnect(self, delay: float = 5.0):
        """Schedule a reconnection attempt after certain delay"""
        logger.info(f"Scheduling reconnection in {delay} seconds")
        
        # Define reconnection logic
        async def do_reconnect():
            logger.info("Attempting reconnection...")
            if self.client:
                try:
                    self.client.disconnect()
                except:
                    pass
                self.client = None
                
            if self.stream_client:
                try:
                    self.stream_client.disconnect()
                except:
                    pass
                self.stream_client = None
                
            # Use the last credentials (or defaults if none)
            await self.connect({
                "userId": "17535100",
                "password": "GuiZarHoh2711!"
            })
        
        # Cancel any existing timer
        if self.reconnect_timer:
            self.reconnect_timer.cancel()
            
        # Setup new timer
        self.reconnect_timer = Timer(delay, lambda: asyncio.create_task(do_reconnect()))
        self.reconnect_timer.daemon = True
        self.reconnect_timer.start()

    async def check_trade_status(self, order: int) -> Dict[str, Any]:
        """Check the trade status."""
        if not self.client or not self.connected:
            return {
                "success": False,
                "error": "Not connected to XTB"
            }
            
        try:
            response = self.client.commandExecute("tradeTransactionStatus", {"order": order})
            logger.info(f"📊 Trade status: {response}")
            return {
                "success": True,
                "data": response
            }
        except Exception as e:
            logger.exception(f"Error checking trade status: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_symbol_data(self, symbol: str) -> Dict[str, Any]:
        """Get symbol data"""
        if not self.client or not self.connected:
            return {
                "success": False,
                "error": "Not connected to XTB"
            }
            
        try:
            response = self.client.commandExecute("getSymbol", {"symbol": symbol})
            if response.get("status"):
                return {
                    "success": True,
                    "data": response.get("returnData", {})
                }
            else:
                return {
                    "success": False,
                    "error": response.get("errorDescr", "Unknown error")
                }
        except Exception as e:
            logger.exception(f"Error getting symbol data: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def disconnect(self) -> Dict[str, Any]:
        """Disconnect from XTB API"""
        logger.info("Disconnecting from XTB API")
        
        try:
            if self.stream_client:
                self.stream_client.disconnect()
                self.stream_client = None
                
            if self.client:
                self.client.disconnect()
                self.client = None
                
            self.connected = False
            self.ssid = None
            
            return {
                "success": True
            }
        except Exception as e:
            logger.exception(f"Error during disconnect: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Create singleton instance
xtb_bridge = XTBBridge()
