
import os
import json
import logging
import sys
import time
import traceback
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Add the current directory to Python path to find the modules
current_dir = str(Path(__file__).resolve().parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
    logger.info(f"Added {current_dir} to Python path")

# Import after path setup
try:
    from .XTBTrader import XTBTrader
except ImportError:
    logger.error("Failed to import XTBTrader. Trying alternative import...")
    try:
        sys.path.append(os.path.dirname(os.path.dirname(current_dir)))
        from server.services.XTBTrader import XTBTrader
    except ImportError as e:
        logger.critical(f"Fatal: Cannot import XTBTrader: {e}")
        sys.exit(1)

# Create FastAPI app with CORS support
app = FastAPI(title="XTB Trading Bridge")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global trader instance and ready flag
xtb_trader = None
is_ready = False
last_error = None

# Define request models
class LoginRequest(BaseModel):
    userId: str
    password: str

class TradeRequest(BaseModel):
    symbol: str
    volume: float
    command: int  # 0 for BUY, 1 for SELL
    orderType: int  # 0 for OPEN

class CloseTradeRequest(BaseModel):
    symbol: str
    volume: float
    orderId: int
    command: int  # 0 for BUY, 1 for SELL

class StatusRequest(BaseModel):
    orderId: int

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
    global is_ready, last_error
    try:
        # Log Python and dependencies versions
        import sys
        logger.info(f"Python version: {sys.version}")
        logger.info("Bridge initialization starting...")

        # Test creating XTBTrader to verify import works
        test_trader = XTBTrader()
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

@app.on_event("startup")
async def startup_event():
    """Startup event handler to initialize the bridge"""
    await initialize_bridge()

@app.get("/ping")
async def ping():
    """Health check endpoint that also indicates bridge readiness"""
    logger.info("Health check called")
    global is_ready, last_error
    return {
        "message": "pong",
        "status": "XTB Bridge is running",
        "ready": is_ready,
        "error": last_error
    }

@app.post("/connect")
async def connect(request: LoginRequest):
    """Connect to XTB API with user credentials"""
    global xtb_trader, is_ready, last_error

    try:
        if not is_ready:
            logger.warning("Bridge not ready, attempting to initialize")
            await initialize_bridge()
            if not is_ready:
                raise HTTPException(status_code=503, detail=f"Bridge not ready: {last_error}")

        # Create new XTBTrader instance
        xtb_trader = XTBTrader()

        logger.info(f"Connecting with user ID: {request.userId}")
        response = xtb_trader.connect(request.userId, request.password)

        if not response["success"]:
            logger.error(f"Connection failed: {response.get('error')}")
            last_error = response.get("error", "Authentication failed")
            raise HTTPException(status_code=401, detail=last_error)

        logger.info("Successfully connected to XTB API")
        return response

    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Connection error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        last_error = error_msg
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/trade")
async def trade(request: TradeRequest):
    """Execute a new trade"""
    global xtb_trader, is_ready, last_error

    try:
        if not is_ready:
            logger.warning("Bridge not ready, attempting to initialize")
            await initialize_bridge()
            if not is_ready:
                raise HTTPException(status_code=503, detail=f"Bridge not ready: {last_error}")

        if not xtb_trader:
            raise HTTPException(status_code=400, detail="Not connected to XTB API. Please connect first.")

        logger.info(f"Opening trade: {request.symbol}, volume: {request.volume}, command: {request.command}")
        
        # Execute the trade
        is_buy = request.command == 0  # 0 for BUY, 1 for SELL
        response = xtb_trader.open_trade(request.symbol, request.volume, is_buy)

        if not response["success"]:
            logger.error(f"Trade failed: {response.get('error')}")
            last_error = response.get("error", "Trade execution failed")
            raise HTTPException(status_code=400, detail=last_error)

        logger.info(f"Trade successful: {response}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Trade error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        last_error = error_msg
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/close")
async def close_trade(request: CloseTradeRequest):
    """Close an existing trade"""
    global xtb_trader, is_ready, last_error

    try:
        if not is_ready:
            logger.warning("Bridge not ready, attempting to initialize")
            await initialize_bridge()
            if not is_ready:
                raise HTTPException(status_code=503, detail=f"Bridge not ready: {last_error}")

        if not xtb_trader:
            raise HTTPException(status_code=400, detail="Not connected to XTB API. Please connect first.")

        logger.info(f"Closing trade: {request.symbol}, volume: {request.volume}, orderId: {request.orderId}")
        
        # Execute the close trade
        is_buy = request.command == 0  # 0 for BUY, 1 for SELL
        response = xtb_trader.close_trade(request.symbol, request.volume, request.orderId, is_buy)

        if not response["success"]:
            logger.error(f"Close trade failed: {response.get('error')}")
            last_error = response.get("error", "Trade closure failed")
            raise HTTPException(status_code=400, detail=last_error)

        logger.info(f"Trade closure successful: {response}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Close trade error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        last_error = error_msg
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/status")
async def status(request: StatusRequest):
    """Check the status of a trade"""
    global xtb_trader, is_ready, last_error

    try:
        if not is_ready:
            logger.warning("Bridge not ready, attempting to initialize")
            await initialize_bridge()
            if not is_ready:
                raise HTTPException(status_code=503, detail=f"Bridge not ready: {last_error}")

        if not xtb_trader:
            raise HTTPException(status_code=400, detail="Not connected to XTB API. Please connect first.")

        logger.info(f"Checking status for order: {request.orderId}")
        
        # Get trade status
        response = xtb_trader.check_trade_status(request.orderId)

        if not response["success"]:
            logger.error(f"Status check failed: {response.get('error')}")
            last_error = response.get("error", "Status check failed")
            raise HTTPException(status_code=400, detail=last_error)

        logger.info(f"Status check successful: {response}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Status check error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        last_error = error_msg
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/disconnect")
async def disconnect():
    """Disconnect from XTB API"""
    global xtb_trader, is_ready

    try:
        if not xtb_trader:
            return {"success": True, "message": "Not connected"}

        logger.info("Disconnecting from XTB API")
        response = xtb_trader.disconnect()
        xtb_trader = None

        logger.info("Disconnected from XTB API")
        return response

    except Exception as e:
        error_msg = f"Disconnect error: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    try:
        port = int(os.environ.get("XTB_BRIDGE_PORT", "8001"))
        logger.info(f"Starting XTB Bridge API on port {port}")
        logger.info(f"Python version: {sys.version}")
        logger.info(f"Current directory: {current_dir}")

        uvicorn.run(
            app,
            host="0.0.0.0",  # Explicitly bind to all interfaces
            port=port,
            log_level="info"
        )
    except Exception as e:
        logger.exception(f"Failed to start XTB Bridge: {e}")
        sys.exit(1)
