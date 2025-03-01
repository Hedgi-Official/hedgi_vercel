import os
import sys
import logging
import traceback
from pathlib import Path
from typing import Optional, List, Dict, Any, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging - Use more verbose settings
logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for more detailed logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # Ensure logs go to stdout
    ]
)
logger = logging.getLogger("xtb_bridge")
logger.info("XTB Bridge starting up...")

# Log Python environment info
logger.info(f"Python version: {sys.version}")
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f"Current script directory: {Path(__file__).resolve().parent}")

# Directly use the assets path without modifying sys.path first
assets_path = Path(__file__).resolve().parent.parent.parent / 'attached_assets'
logger.info(f"Attached assets path: {assets_path}")

# Verify that the XTBTrader.py file exists in the assets path
xtb_trader_path = assets_path / 'XTBTrader.py'
logger.info(f"XTBTrader.py exists: {xtb_trader_path.exists()}")

# Add attached_assets to sys.path first, before any other potential paths
if assets_path.exists():
    sys.path.insert(0, str(assets_path))
    logger.info(f"Added {assets_path} to sys.path")
else:
    logger.error(f"Attached assets directory does not exist: {assets_path}")

# Log all directories in sys.path for debugging
logger.info(f"sys.path: {sys.path}")

# Now try to import XTBTrader
try:
    # Import directly from the module in attached_assets
    logger.info("Attempting to import XTBTrader...")
    from XTBTrader import XTBTrader
    logger.info("Successfully imported XTBTrader")

    # Log the imported module details
    logger.info(f"XTBTrader module located at: {XTBTrader.__file__ if hasattr(XTBTrader, '__file__') else 'Unknown'}")

except ImportError as e:
    logger.error(f"Failed to import XTBTrader: {e}")
    logger.error(f"Import error traceback: {traceback.format_exc()}")

    # List contents of the attached_assets directory
    if assets_path.exists():
        logger.error(f"Files in attached_assets: {os.listdir(str(assets_path))}")

        # Read the content of XTBTrader.py if it exists
        if xtb_trader_path.exists():
            with open(xtb_trader_path, 'r') as f:
                logger.info(f"First 50 chars of XTBTrader.py: {f.read(50)}...")

    # Try to copy the file to the current directory as a fallback
    try:
        import shutil
        current_dir = Path(__file__).resolve().parent
        if xtb_trader_path.exists():
            dest_path = current_dir / 'XTBTrader.py'
            shutil.copy(str(xtb_trader_path), str(dest_path))
            logger.info(f"Copied XTBTrader.py to {dest_path}")

            # Also copy xAPIConnector.py
            connector_path = assets_path / 'xAPIConnector.py'
            if connector_path.exists():
                shutil.copy(str(connector_path), str(current_dir / 'xAPIConnector.py'))
                logger.info(f"Copied xAPIConnector.py to {current_dir}")

            # Now try to import it from the current directory
            sys.path.insert(0, str(current_dir))
            from XTBTrader import XTBTrader
            logger.info("Successfully imported XTBTrader after copying to current directory")
        else:
            logger.error("XTBTrader.py doesn't exist, cannot copy")
    except Exception as copy_error:
        logger.error(f"Failed to copy and import as fallback: {copy_error}")
        logger.error(traceback.format_exc())
        raise RuntimeError(f"Could not import XTBTrader: {e}") from e


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