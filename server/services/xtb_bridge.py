
import json
import time
import logging
from websocket import create_connection
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import XTBTrader class
try:
    from .XTBTrader import XTBTrader
    logging.info("Successfully imported XTBTrader")
except ImportError:
    try:
        from XTBTrader import XTBTrader
        logging.info("Successfully imported XTBTrader from root")
    except ImportError:
        logging.error("Failed to import XTBTrader")
        XTBTrader = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

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

# Global variables
trader = None
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
    orderType: int  # 0 for OPEN, 2 for CLOSE
    order: int = None  # order number for closing trades
    sl: float = 0
    tp: float = 0
    comment: str = ""

class StatusRequest(BaseModel):
    orderId: int

@app.get("/ping", response_class=JSONResponse)
async def ping():
    """Check if the API bridge is running and ready"""
    global is_ready, last_error
    
    logger.info("Ping request received")
    
    return {
        "message": "pong",
        "ready": is_ready,
        "error": last_error if not is_ready and last_error else None
    }

@app.post("/connect", response_class=JSONResponse)
async def connect(request: LoginRequest):
    """Connect to XTB API"""
    global trader, is_ready, last_error

    logger.info("Connection request received")

    if is_ready and trader is not None:
        logger.info("Already connected, returning OK")
        return JSONResponse(status_code=200, content={
            "success": True,
            "message": "Already connected"
        })

    if XTBTrader is None:
        error_msg = "XTBTrader module is not available"
        logger.error(error_msg)
        last_error = error_msg
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": error_msg
        })

    try:
        trader = XTBTrader()
        connection_result = trader.connect(request.userId, request.password)
        
        if not connection_result.get("success"):
            error_msg = connection_result.get("error") or "Unknown connection error"
            logger.error(f"Connection failed: {error_msg}")
            last_error = error_msg
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": error_msg
            })
        
        is_ready = True
        last_error = None
        logger.info("Connection successful")
        
        return JSONResponse(status_code=200, content={
            "success": True
        })
    
    except Exception as e:
        error_msg = f"Unexpected error during connection: {str(e)}"
        logger.error(error_msg)
        last_error = error_msg
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": error_msg
        })

@app.post("/trade", response_class=JSONResponse)
async def trade(request: TradeRequest):
    """Execute a trade"""
    global trader, is_ready, last_error

    logger.info(f"Trade request received: {request}")

    if not is_ready or trader is None:
        error_msg = "Not connected to XTB API"
        logger.error(error_msg)
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": error_msg
        })

    try:
        # Prepare trade parameters
        trade_params = {
            "symbol": request.symbol,
            "volume": request.volume,
            "cmd": request.command,
            "type": request.orderType,
            "sl": request.sl,
            "tp": request.tp,
            "comment": request.comment
        }
        
        # Add order number for closing trades
        if request.orderType == 2 and request.order is not None:  # CLOSE order
            trade_params["order"] = request.order
            
        # Execute the trade
        trade_result = trader.execute_trade(trade_params)
        
        if not trade_result.get("success"):
            error_msg = trade_result.get("error") or "Unknown trade error"
            logger.error(f"Trade failed: {error_msg}")
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": error_msg
            })
        
        logger.info(f"Trade successful: {trade_result}")
        return JSONResponse(status_code=200, content={
            "success": True,
            "orderId": trade_result.get("orderId"),
            "debug_info": trade_result.get("debug_info")
        })
    
    except Exception as e:
        error_msg = f"Unexpected error during trade: {str(e)}"
        logger.error(error_msg)
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": error_msg,
            "traceback": str(e)
        })

@app.post("/status", response_class=JSONResponse)
async def status(request: StatusRequest):
    """Check status of an order"""
    global trader, is_ready, last_error

    logger.info(f"Status request received for order: {request.orderId}")

    if not is_ready or trader is None:
        error_msg = "Not connected to XTB API"
        logger.error(error_msg)
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": error_msg
        })

    try:
        status_result = trader.check_trade_status(request.orderId)
        
        if not status_result.get("success"):
            error_msg = status_result.get("error") or "Unknown status error"
            logger.error(f"Status check failed: {error_msg}")
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": error_msg
            })
        
        logger.info(f"Status check successful: {status_result}")
        return JSONResponse(status_code=200, content={
            "success": True,
            "returnData": status_result.get("returnData", {}),
            "debug_info": status_result.get("debug_info")
        })
    
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
