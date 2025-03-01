import json
import logging
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from websocket import create_connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Import XTBTrader class
try:
    from XTBTrader import XTBTrader
    logger.info("Successfully imported XTBTrader")
except ImportError:
    try:
        from .XTBTrader import XTBTrader
        logger.info("Successfully imported XTBTrader from relative path")
    except ImportError:
        logger.error("Failed to import XTBTrader")
        raise ImportError("XTBTrader module not found")

# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize XTBTrader
trader = None
is_ready = False
last_error = None

# Define models
class ConnectRequest(BaseModel):
    userId: str
    password: str

class TradeRequest(BaseModel):
    symbol: str
    volume: float
    is_buy: bool

class CloseTradeRequest(BaseModel):
    symbol: str
    volume: float
    order_id: int
    is_buy: bool

class StatusRequest(BaseModel):
    orderId: int

@app.get("/ping", response_class=JSONResponse)
async def ping():
    """Health check endpoint"""
    global is_ready, last_error
    return {
        "message": "pong",
        "ready": is_ready,
        "error": last_error
    }

@app.post("/connect", response_class=JSONResponse)
async def connect(request: ConnectRequest):
    """Connect to XTB API"""
    global trader, is_ready, last_error

    logger.info(f"Connect request received for user: {request.userId}")

    try:
        trader = XTBTrader()
        result = trader.connect(request.userId, request.password)

        if not result.get("success"):
            error_msg = result.get("error") or "Unknown connection error"
            logger.error(f"Connection failed: {error_msg}")
            is_ready = False
            last_error = error_msg
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": error_msg
            })

        is_ready = True
        last_error = None
        logger.info("Connection successful")
        return JSONResponse(status_code=200, content={
            "success": True,
            "sessionId": result.get("sessionId")
        })

    except Exception as e:
        error_msg = f"Unexpected error during connection: {str(e)}"
        logger.error(error_msg)
        is_ready = False
        last_error = error_msg
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": error_msg
        })

@app.post("/trade", response_class=JSONResponse)
async def trade(request: TradeRequest):
    """Open a new trade"""
    global trader, is_ready, last_error

    logger.info(f"Trade request received: {request.dict()}")

    if not is_ready or trader is None:
        error_msg = "XTB bridge service is not ready"
        logger.error(f"{error_msg}")
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": error_msg
        })

    try:
        result = trader.open_trade(request.symbol, request.volume, request.is_buy)

        if not result.get("success"):
            error_msg = result.get("error") or "Unknown trade error"
            logger.error(f"Trade failed: {error_msg}")
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": error_msg
            })

        logger.info(f"Trade successful: {result}")
        return JSONResponse(status_code=200, content=result)

    except Exception as e:
        error_msg = f"Unexpected error during trade: {str(e)}"
        logger.error(error_msg)
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": error_msg
        })

@app.post("/close_trade", response_class=JSONResponse)
async def close_trade(request: CloseTradeRequest):
    """Close an existing trade"""
    global trader, is_ready, last_error

    logger.info(f"Close trade request received: {request.dict()}")

    if not is_ready or trader is None:
        error_msg = "XTB bridge service is not ready"
        logger.error(f"{error_msg}")
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": error_msg
        })

    try:
        result = trader.close_trade(request.symbol, request.volume, request.order_id, request.is_buy)

        if not result.get("success"):
            error_msg = result.get("error") or "Unknown close trade error"
            logger.error(f"Close trade failed: {error_msg}")
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": error_msg
            })

        logger.info(f"Close trade successful: {result}")
        return JSONResponse(status_code=200, content=result)

    except Exception as e:
        error_msg = f"Unexpected error during close trade: {str(e)}"
        logger.error(error_msg)
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": error_msg
        })

@app.post("/status", response_class=JSONResponse)
async def check_status(request: StatusRequest):
    """Check trade status"""
    global trader, is_ready, last_error

    logger.info(f"Status check request received for order: {request.orderId}")

    if not is_ready or trader is None:
        error_msg = "XTB bridge service is not ready"
        logger.error(f"{error_msg}")
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": error_msg
        })

    try:
        result = trader.check_trade_status(request.orderId)

        if not result.get("success"):
            error_msg = result.get("error") or "Unknown status check error"
            logger.error(f"Status check failed: {error_msg}")
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": error_msg
            })

        logger.info(f"Status check successful: {result}")
        return JSONResponse(status_code=200, content=result)

    except Exception as e:
        error_msg = f"Unexpected error during status check: {str(e)}"
        logger.error(error_msg)
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": error_msg
        })

@app.get("/disconnect", response_class=JSONResponse)
async def disconnect():
    """Disconnect from XTB API"""
    global trader, is_ready, last_error

    logger.info("Disconnect request received")

    if not is_ready or trader is None:
        logger.info("Not connected, no need to disconnect")
        return JSONResponse(status_code=200, content={
            "success": True,
            "message": "Not connected, no need to disconnect"
        })

    try:
        result = trader.disconnect()
        is_ready = False

        if not result.get("success"):
            error_msg = result.get("error") or "Unknown disconnect error"
            logger.error(f"Disconnect failed: {error_msg}")
            last_error = error_msg
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": error_msg
            })

        logger.info("Disconnect successful")
        return JSONResponse(status_code=200, content={
            "success": True
        })

    except Exception as e:
        error_msg = f"Unexpected error during disconnect: {str(e)}"
        logger.error(error_msg)
        last_error = error_msg
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": error_msg
        })

# Run the FastAPI app when this script is executed directly
if __name__ == "__main__":
    try:
        uvicorn.run(app, host="0.0.0.0", port=8003)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")