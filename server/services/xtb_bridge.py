import os
import json
import logging
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
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

# Add the current directory to Python path to find the modules
current_dir = str(Path(__file__).resolve().parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
    logger.info(f"Added {current_dir} to Python path")

try:
    # First try local import
    try:
        from XTBTrader import XTBTrader
        logger.info("Successfully imported XTBTrader from local path")
    except ImportError:
        # Try from attached_assets directory
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / 'attached_assets'))
        logger.info(f"Added attached_assets to Python path: {str(Path(__file__).resolve().parent.parent.parent / 'attached_assets')}")
        from XTBTrader import XTBTrader
        logger.info("Successfully imported XTBTrader from attached_assets")
except ImportError as e:
    logger.error(f"Failed to import XTBTrader: {e}")
    logger.error(f"Python path: {sys.path}")
    # List all available modules in current directory
    logger.error(f"Files in current directory: {os.listdir(current_dir)}")
    logger.error(f"Files in attached_assets: {os.listdir(str(Path(__file__).resolve().parent.parent.parent / 'attached_assets'))}")
    raise

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

@app.get("/ping")
async def ping():
    """Health check endpoint that also indicates bridge readiness"""
    logger.info("Health check called")
    global is_ready
    return {
        "message": "pong",
        "status": "XTB Bridge is running",
        "ready": is_ready
    }

class LoginRequest(BaseModel):
    userId: str
    password: str

class TradeRequest(BaseModel):
    symbol: str
    volume: float
    command: int  # 0 for BUY, 1 for SELL
    orderType: int  # 0 for OPEN, 2 for CLOSE
    order: int | None = None  # Required for closing trades

class StatusRequest(BaseModel):
    orderId: int

async def initialize_bridge():
    """Initialize the bridge asynchronously"""
    global is_ready
    try:
        # Log Python and dependencies versions
        import sys
        logger.info(f"Python version: {sys.version}")
        logger.info("Bridge initialization starting...")

        # Any additional initialization can go here

        is_ready = True
        logger.info("Bridge initialization complete")
    except Exception as e:
        logger.error(f"Bridge initialization failed: {e}")
        is_ready = False

@app.on_event("startup")
async def startup_event():
    """Startup event handler to initialize the bridge"""
    await initialize_bridge()

@app.post("/connect")
async def connect(request: LoginRequest):
    """Connect to XTB API with the provided credentials"""
    global xtb_trader, is_ready

    if not is_ready:
        logger.error("Bridge not ready for connections")
        raise HTTPException(status_code=503, detail="Bridge not ready")

    try:
        logger.info("Attempting to connect to XTB API...")
        xtb_trader = XTBTrader()

        # Ensure userId is a string when passed to connect
        response = xtb_trader.connect(
            str(request.userId),  # Convert to string first to handle both string/int inputs
            request.password
        )

        if not response["success"]:
            logger.error(f"Login failed: {response.get('error')}")
            raise HTTPException(status_code=401, detail=response["error"])

        logger.info("Successfully connected to XTB API")
        return response

    except Exception as e:
        logger.exception(f"Connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trade")
async def place_trade(request: TradeRequest):
    """Place a trade via XTB API"""
    if not xtb_trader:
        raise HTTPException(status_code=400, detail="Not connected to XTB API")

    try:
        logger.info(f"Placing trade: {request.symbol}, volume: {request.volume}")

        if request.orderType == 0:  # OPEN
            response = xtb_trader.open_trade(
                request.symbol,
                request.volume,
                request.command == 0  # True for BUY, False for SELL
            )
        else:  # CLOSE
            if request.order is None:
                raise HTTPException(status_code=400, detail="Order ID required for closing trades")
            response = xtb_trader.close_trade(
                request.symbol,
                request.volume,
                request.order,
                request.command == 0  # True for BUY, False for SELL
            )

        if not response["success"]:
            raise HTTPException(status_code=400, detail=response["error"])

        logger.info(f"Trade response: {response}")
        return response

    except Exception as e:
        logger.exception(f"Trade error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/status")
async def check_status(request: StatusRequest):
    """Check trade status via XTB API"""
    if not xtb_trader:
        raise HTTPException(status_code=400, detail="Not connected to XTB API")

    try:
        logger.info(f"Checking status for order: {request.orderId}")
        response = xtb_trader.check_trade_status(request.orderId)

        if not response["success"]:
            raise HTTPException(status_code=400, detail=response["error"])

        logger.info(f"Status response: {response}")
        return response

    except Exception as e:
        logger.exception(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/disconnect")
async def disconnect():
    """Disconnect from XTB API"""
    global xtb_trader
    if xtb_trader:
        try:
            logger.info("Disconnecting from XTB API")
            response = xtb_trader.disconnect()
            xtb_trader = None
            return response
        except Exception as e:
            logger.exception(f"Disconnect error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    return {"success": True}

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