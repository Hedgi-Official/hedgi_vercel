from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import sys
import os
import traceback
from typing import Optional, Dict, Any, Union
import json
import time
from websocket import create_connection
import websocket_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

class ContextLogger:
    def __init__(self, logger):
        self.logger = logger

    def _format_context(self, context):
        if not context:
            return ""
        return " | " + " | ".join(f"{k}={v}" for k, v in context.items())

    def info(self, msg, context=None, *args, **kwargs):
        formatted_msg = msg + self._format_context(context)
        return self.logger.info(formatted_msg, *args, **kwargs)

    def error(self, msg, context=None, *args, **kwargs):
        formatted_msg = msg + self._format_context(context)
        return self.logger.error(formatted_msg, *args, **kwargs)

    def warning(self, msg, context=None, *args, **kwargs):
        formatted_msg = msg + self._format_context(context)
        return self.logger.warning(formatted_msg, *args, **kwargs)

    def debug(self, msg, context=None, *args, **kwargs):
        formatted_msg = msg + self._format_context(context)
        return self.logger.debug(formatted_msg, *args, **kwargs)

logger = ContextLogger(logging.getLogger(__name__))

# Make sure we can find XTBTrader
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the XTBTrader
try:
    from XTBTrader import XTBTrader
    logger.info("Successfully imported XTBTrader")
except ImportError as e:
    logger.error(f"Failed to import XTBTrader: {e}")
    # Try to debug import
    logger.error(f"Current directory: {current_dir}")
    logger.error(f"Python path: {sys.path}")
    logger.error(f"Files in directory: {os.listdir(current_dir)}")
    raise

# Global variables
trader = None
is_ready = False
last_error = None

# API models
class LoginRequest(BaseModel):
    userId: str
    password: str

class TradeRequest(BaseModel):
    symbol: str
    volume: float
    command: int  # 0 for BUY, 1 for SELL
    orderType: int  # 0 for OPEN, 2 for CLOSE
    order: Optional[int] = None  # For closing trades

class StatusRequest(BaseModel):
    orderId: int

# Setup FastAPI app
app = FastAPI(title="XTB API Bridge", description="Bridge service for XTB API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=JSONResponse)
async def root():
    """Check if the service is ready with detailed status"""
    global trader, is_ready, last_error

    context = {
        "is_ready": is_ready,
        "trader_initialized": trader is not None
    }

    if is_ready:
        logger.info("Service is ready", context=context)
        return {"status": "ready", "message": "XTB bridge service is ready", "details": context}
    else:
        error_message = last_error or "Service not yet initialized"
        logger.warning("Service not ready", context={"error": error_message, **context})
        return {"status": "not_ready", "message": error_message, "details": context}

@app.post("/connect", response_class=JSONResponse)
async def connect(request: LoginRequest):
    """Connect to XTB API with detailed logging"""
    global trader, is_ready, last_error

    context = {"userId": request.userId}
    logger.info("Connection request received", context=context)

    try:
        # Initialize trader if not already initialized
        if trader is None:
            trader = XTBTrader()
            logger.info("XTBTrader instance created", context=context)

        result = trader.connect(request.userId, request.password)

        context.update({
            "success": result.get("success"),
            "error": result.get("error"),
            "sessionId": result.get("sessionId")
        })

        if not result.get("success"):
            is_ready = False
            last_error = result.get("error") or "Unknown connection error"
            logger.error("Connection failed", context=context)
            return JSONResponse(status_code=400, content={
                "detail": last_error,
                "status": "error",
                "debug_info": result
            })

        is_ready = True
        last_error = None
        logger.info("Connection successful", context=context)
        return result

    except Exception as e:
        is_ready = False
        last_error = str(e)
        error_msg = f"Connection error: {str(e)}"
        logger.error(error_msg, context={"error": str(e), "traceback": traceback.format_exc()})
        return JSONResponse(status_code=500, content={
            "detail": error_msg,
            "status": "error",
            "debug_info": {"error": str(e), "traceback": traceback.format_exc()}
        })

@app.post("/trade", response_class=JSONResponse)
async def trade(request: TradeRequest):
    """Execute a trade with detailed logging"""
    global trader, is_ready, last_error

    context = {
        "symbol": request.symbol,
        "volume": request.volume,
        "command": request.command,
        "orderType": request.orderType,
        "order": request.order
    }

    logger.info("Trade request received", context=context)

    if not is_ready or trader is None:
        error_msg = "XTB bridge service is not ready"
        logger.error(error_msg, context=context)
        return JSONResponse(status_code=400, content={"detail": error_msg})

    try:
        # Determine if it's an open or close trade
        if request.orderType == 0:  # OPEN trade
            is_buy = request.command == 0  # 0 is BUY, 1 is SELL
            logger.info("Opening trade", context={**context, "is_buy": is_buy})
            result = trader.open_trade(request.symbol, request.volume, is_buy)
        elif request.orderType == 2:  # CLOSE trade
            if request.order is None:
                error_msg = "Order ID is required for closing trades"
                logger.error(error_msg, context=context)
                return JSONResponse(status_code=400, content={"detail": error_msg})

            # For closing, command is opposite (if opened with BUY, close with SELL)
            is_buy = request.command == 0  # 0 is BUY, 1 is SELL
            logger.info("Closing trade", context={**context, "is_buy": is_buy})
            result = trader.close_trade(request.symbol, request.volume, request.order, is_buy)
        else:
            error_msg = f"Unsupported order type: {request.orderType}"
            logger.error(error_msg, context=context)
            return JSONResponse(status_code=400, content={"detail": error_msg})

        context.update({
            "success": result.get("success"),
            "error": result.get("error"),
            "orderId": result.get("orderId")
        })

        if not result.get("success"):
            logger.error("Trade failed", context=context)
            return JSONResponse(status_code=400, content={
                "detail": result.get("error") or "Unknown trade error",
                "status": "error",
                "debug_info": result
            })

        logger.info("Trade successful", context=context)
        return result

    except Exception as e:
        error_msg = f"Trade error: {str(e)}"
        logger.error(error_msg, context={"error": str(e), "traceback": traceback.format_exc(), **context})
        return JSONResponse(status_code=500, content={
            "detail": error_msg,
            "status": "error",
            "debug_info": {"error": str(e), "traceback": traceback.format_exc()}
        })

@app.post("/status", response_class=JSONResponse)
async def check_status(request: StatusRequest):
    """Check trade status with detailed logging"""
    global trader, is_ready, last_error

    context = {"orderId": request.orderId}
    logger.info("Status check request received", context=context)

    if not is_ready or trader is None:
        error_msg = "XTB bridge service is not ready"
        logger.error(error_msg, context=context)
        return JSONResponse(status_code=400, content={"detail": error_msg})

    try:
        logger.info("Checking trade status", context=context)
        result = trader.check_trade_status(request.orderId)

        context.update({
            "success": result.get("success"),
            "error": result.get("error"),
            "status": result.get("status")
        })

        if not result.get("success"):
            logger.error("Status check failed", context=context)
            return JSONResponse(status_code=400, content={
                "detail": result.get("error") or "Unknown status check error",
                "status": "error",
                "debug_info": result
            })

        logger.info("Status check successful", context=context)
        return result

    except Exception as e:
        error_msg = f"Status check error: {str(e)}"
        logger.error(error_msg, context={"error": str(e), "traceback": traceback.format_exc()})
        return JSONResponse(status_code=500, content={
            "detail": error_msg,
            "status": "error",
            "debug_info": {"error": str(e), "traceback": traceback.format_exc()}
        })

@app.post("/disconnect", response_class=JSONResponse)
async def disconnect():
    """Disconnect from XTB API with detailed logging"""
    global trader, is_ready, last_error

    try:
        if trader is not None:
            logger.info("Disconnecting from XTB API")
            result = trader.disconnect()

            context = {
                'success': result.get('success'),
                'error': result.get('error')
            }

            if not result.get('success'):
                logger.error("Disconnect failed", context=context)
            else:
                logger.info("Disconnect successful", context=context)
                trader = None
                is_ready = False

            return result
        else:
            logger.info("No active connection to disconnect")
            return {"success": True, "message": "No active connection"}
    except Exception as e:
        error_msg = f"Disconnect error: {str(e)}"
        logger.error(error_msg, context={"error": str(e), "traceback": traceback.format_exc()})
        return JSONResponse(status_code=500, content={
            "detail": error_msg,
            "status": "error",
            "debug_info": {"error": str(e), "traceback": traceback.format_exc()}
        })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)