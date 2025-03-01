import os
import sys
import time
import traceback
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Add the current directory to the Python path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from XTBTrader import XTBTrader
    from xAPIConnector import APIClient, APIStreamClient, TransactionSide, TransactionType
    logger.info("Successfully imported XTBTrader and xAPIConnector")
except ImportError as e:
    logger.error(f"Import error: {e}")
    logger.error(traceback.format_exc())
    raise

# Trader singleton
trader = None
is_ready = False
last_error = None

# API models
class ConnectRequest(BaseModel):
    userId: str
    password: str

class TradeRequest(BaseModel):
    symbol: str
    volume: float
    command: int  # 0 for BUY, 1 for SELL
    orderType: int  # 0 for OPEN, 2 for CLOSE
    order: int = None  # Order number for closing trades

class StatusRequest(BaseModel):
    orderId: int

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests"""
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(f"Request: {request.method} {request.url.path} completed in {process_time:.3f}s with status {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request: {request.method} {request.url.path} failed with error: {str(e)}")
        logger.error(traceback.format_exc())
        raise

async def initialize_bridge():
    """Initialize the bridge asynchronously"""
    global is_ready, last_error, trader
    try:
        # Log Python and dependencies versions
        import sys
        logger.info(f"Python version: {sys.version}")
        logger.info("Bridge initialization starting...")

        # Test creating XTBTrader to verify import works
        trader = XTBTrader()
        logger.info("XTBTrader class imported successfully")

        # Any additional initialization can go here
        is_ready = True
        last_error = None
        logger.info("Bridge initialization complete and ready to accept requests")
    except Exception as e:
        logger.error(f"Bridge initialization failed: {e}")
        logger.error(traceback.format_exc())
        is_ready = False
        last_error = str(e)

@app.get("/ping")
async def ping():
    """Check if the service is running and ready"""
    logger.info(f"Ping received. Ready status: {is_ready}")
    if not is_ready:
        logger.warning(f"Bridge not ready. Last error: {last_error}")
        return {"message": "pong", "ready": False, "status": "initializing", "error": last_error}
    return {"message": "pong", "ready": True, "status": "ready"}

@app.post("/connect")
async def connect(request: ConnectRequest):
    """Connect to XTB API"""
    global trader, is_ready

    if not is_ready:
        logger.error("Bridge not ready for connection")
        raise HTTPException(status_code=503, detail="Bridge service not ready")

    try:
        logger.info(f"Connecting with user ID: {request.userId}")
        if trader is None:
            trader = XTBTrader()

        result = trader.connect(request.userId, request.password)

        logger.info(f"Connection result: {result}")
        if not result.get("success"):
            logger.error(f"Connection failed: {result.get('error')}")
            return result

        return result
    except Exception as e:
        error_msg = f"Connection error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return {"success": False, "error": error_msg}

@app.post("/trade")
async def trade(request: TradeRequest):
    """Execute a trade"""
    global trader

    if not is_ready:
        logger.error("Bridge not ready for trading")
        raise HTTPException(status_code=503, detail="Bridge service not ready")

    if trader is None:
        logger.error("Trader is not initialized")
        return {"success": False, "error": "Not connected to XTB API"}

    try:
        is_buy = request.command == 0  # 0 for BUY, 1 for SELL

        if request.orderType == 0:  # OPEN
            logger.info(f"Opening trade: {request.symbol}, volume: {request.volume}, is_buy: {is_buy}")
            result = trader.open_trade(request.symbol, request.volume, is_buy)
        elif request.orderType == 2:  # CLOSE
            if request.order is None:
                logger.error("Missing order ID for closing trade")
                return {"success": False, "error": "Order ID is required for closing a trade"}

            logger.info(f"Closing trade: {request.symbol}, volume: {request.volume}, order: {request.order}, is_buy: {is_buy}")
            result = trader.close_trade(request.symbol, request.volume, request.order, is_buy)
        else:
            logger.error(f"Unknown order type: {request.orderType}")
            return {"success": False, "error": f"Unknown order type: {request.orderType}"}

        logger.info(f"Trade result: {result}")
        return result
    except Exception as e:
        error_msg = f"Trade error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return {"success": False, "error": error_msg}

@app.post("/status")
async def status(request: StatusRequest):
    """Check trade status"""
    global trader

    if not is_ready:
        logger.error("Bridge not ready for status check")
        raise HTTPException(status_code=503, detail="Bridge service not ready")

    if trader is None:
        logger.error("Trader is not initialized")
        return {"success": False, "error": "Not connected to XTB API"}

    try:
        logger.info(f"Checking status for order: {request.orderId}")
        result = trader.check_trade_status(request.orderId)
        logger.info(f"Status result: {result}")
        return result
    except Exception as e:
        error_msg = f"Status check error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return {"success": False, "error": error_msg}

@app.post("/disconnect")
async def disconnect():
    """Disconnect from XTB API"""
    global trader

    try:
        if trader is not None:
            logger.info("Disconnecting from XTB API")
            result = trader.disconnect()
            trader = None
            return result
        else:
            logger.info("No active connection to disconnect")
            return {"success": True, "message": "No active connection"}
    except Exception as e:
        error_msg = f"Disconnect error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return {"success": False, "error": error_msg}

# Initialize the bridge on startup
@app.on_event("startup")
async def startup_event():
    """Run initialization on startup"""
    await initialize_bridge()

# Run the server
if __name__ == "__main__":
    port = int(os.getenv("XTB_BRIDGE_PORT", "8001"))
    logger.info(f"Starting XTB bridge on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)