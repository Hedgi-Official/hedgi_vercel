import os
import sys
import time
import traceback
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s\nContext: %(context)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Create a custom logger adapter for adding context
class ContextLogger:
    def __init__(self, logger, default_context=None):
        self.logger = logger
        self.default_context = default_context or {}

    def _log(self, level, msg, context=None, *args, **kwargs):
        context_dict = self.default_context.copy()
        if context:
            context_dict.update(context)
        extra = {'context': str(context_dict)}
        if 'extra' in kwargs:
            kwargs['extra'].update(extra)
        else:
            kwargs['extra'] = extra
        return getattr(self.logger, level)(msg, *args, **kwargs)

    def info(self, msg, context=None, *args, **kwargs):
        return self._log('info', msg, context, *args, **kwargs)

    def error(self, msg, context=None, *args, **kwargs):
        if 'exc_info' not in kwargs:
            kwargs['exc_info'] = True
        return self._log('error', msg, context, *args, **kwargs)

    def warning(self, msg, context=None, *args, **kwargs):
        return self._log('warning', msg, context, *args, **kwargs)

    def debug(self, msg, context=None, *args, **kwargs):
        return self._log('debug', msg, context, *args, **kwargs)

logger = ContextLogger(logging.getLogger(__name__))

# Add the current directory to Python path to find the modules
try:
    from XTBTrader import XTBTrader
    logger.info("Successfully imported XTBTrader")
except ImportError as e:
    logger.error(f"Failed to import XTBTrader: {e}")
    raise

# Global variables
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
    """Log all requests with detailed information"""
    start_time = time.time()
    request_body = None
    try:
        request_body = await request.json()
    except:
        pass

    context = {
        'method': request.method,
        'url': str(request.url),
        'client': request.client.host if request.client else 'unknown',
        'request_body': request_body
    }

    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        status_code = response.status_code

        context.update({
            'status_code': status_code,
            'process_time_ms': round(process_time * 1000, 2)
        })

        logger.info(
            f"Request completed in {process_time:.3f}s with status {status_code}",
            context=context
        )
        return response
    except Exception as e:
        logger.error(
            f"Request failed: {str(e)}",
            context=context
        )
        raise

@app.get("/ping")
async def ping():
    """Check if the service is running and ready"""
    global is_ready, last_error
    logger.info("Health check called", context={'ready': is_ready, 'last_error': last_error})
    return {
        "message": "pong",
        "ready": is_ready,
        "status": "ready" if is_ready else "initializing",
        "error": last_error
    }

@app.post("/connect")
async def connect(request: ConnectRequest):
    """Connect to XTB API with detailed logging"""
    global trader, is_ready

    if not is_ready:
        logger.error("Bridge not ready for connection")
        raise HTTPException(status_code=503, detail="Bridge service not ready")

    try:
        context = {'userId': request.userId}
        logger.info("Attempting to connect to XTB API...", context=context)

        if trader is None:
            trader = XTBTrader()

        result = trader.connect(request.userId, request.password)

        context.update({
            'success': result.get('success'),
            'sessionId': result.get('sessionId'),
            'error': result.get('error')
        })

        if not result.get('success'):
            logger.error("Connection failed", context=context)
            return result

        logger.info("Connection successful", context=context)
        return result
    except Exception as e:
        error_msg = f"Connection error: {str(e)}"
        logger.error(error_msg, context=context)
        return {"success": False, "error": error_msg}

@app.post("/trade")
async def trade(request: TradeRequest):
    """Execute a trade with detailed logging and debug info"""
    global trader

    context = {
        'symbol': request.symbol,
        'volume': request.volume,
        'command': request.command,
        'orderType': request.orderType,
        'order': request.order
    }

    # Enhanced debugging
    debug_info = {
        "bridge_status": {
            "ready": is_ready,
            "trader_initialized": trader is not None,
            "last_error": last_error
        },
        "request": context
    }

    if not is_ready:
        error_msg = "Bridge not ready for trading"
        logger.error(error_msg, context=debug_info)
        return {
            "success": False,
            "error": error_msg,
            "debug_info": debug_info
        }

    if trader is None:
        error_msg = "Trader is not initialized"
        logger.error(error_msg, context=debug_info)
        return {
            "success": False, 
            "error": error_msg,
            "debug_info": debug_info
        }

    try:
        is_buy = request.command == 0

        if request.orderType == 0:  # OPEN
            logger.info("Opening trade", context=context)
            result = trader.open_trade(request.symbol, request.volume, is_buy)
        elif request.orderType == 2:  # CLOSE
            if request.order is None:
                error_msg = "Order ID is required for closing a trade"
                logger.error(error_msg, context=context)
                return {
                    "success": False,
                    "error": error_msg,
                    "debug_info": debug_info
                }

            logger.info("Closing trade", context=context)
            result = trader.close_trade(request.symbol, request.volume, request.order, is_buy)
        else:
            error_msg = f"Unknown order type: {request.orderType}"
            logger.error(error_msg, context=context)
            return {
                "success": False,
                "error": error_msg,
                "debug_info": debug_info
            }

        # Add debug info to result
        if isinstance(result, dict):
            result["debug_info"] = debug_info
        else:
            result = {
                "success": False,
                "error": "Invalid result format from trader",
                "debug_info": debug_info
            }

        if not result.get('success'):
            logger.error("Trade failed", context={"result": result, **context})
        else:
            logger.info("Trade successful", context={"result": result, **context})

        return result

    except Exception as e:
        error_msg = f"Trade error: {str(e)}"
        logger.error(error_msg, context=context)
        return {
            "success": False,
            "error": error_msg,
            "debug_info": debug_info,
            "exception": str(e)
        }

@app.post("/status")
async def status(request: StatusRequest):
    """Check trade status with detailed logging"""
    global trader

    context = {'orderId': request.orderId}

    if not is_ready:
        logger.error("Bridge not ready for status check", context=context)
        raise HTTPException(status_code=503, detail="Bridge service not ready")

    if trader is None:
        logger.error("Trader is not initialized", context=context)
        return {"success": False, "error": "Not connected to XTB API"}

    try:
        logger.info("Checking trade status", context=context)
        result = trader.check_trade_status(request.orderId)

        context.update({
            'success': result.get('success'),
            'status': result.get('status'),
            'error': result.get('error')
        })

        if not result.get('success'):
            logger.error("Status check failed", context=context)
        else:
            logger.info("Status check successful", context=context)

        return result
    except Exception as e:
        error_msg = f"Status check error: {str(e)}"
        logger.error(error_msg, context=context)
        return {"success": False, "error": error_msg}

@app.post("/disconnect")
async def disconnect():
    """Disconnect from XTB API with detailed logging"""
    global trader
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

            return result
        else:
            logger.info("No active connection to disconnect")
            return {"success": True, "message": "No active connection"}
    except Exception as e:
        error_msg = f"Disconnect error: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

# Initialize the bridge on startup
@app.on_event("startup")
async def startup_event():
    """Run initialization on startup"""
    global is_ready, last_error
    try:
        logger.info("Bridge initialization starting...")
        #Added more detailed logging for startup
        logger.info(f"Starting XTB Bridge API on port {os.getenv('XTB_BRIDGE_PORT', '8001')}")
        logger.info(f"Python version: {sys.version}")
        is_ready = True
        last_error = None
        logger.info("Bridge initialization complete")
    except Exception as e:
        logger.error(f"Bridge initialization failed: {e}")
        is_ready = False
        last_error = str(e)

@app.post("/debug")
async def debug_endpoint(request: Request):
    """Echo endpoint for debugging requests"""
    try:
        body = await request.json()
    except:
        body = None

    debug_info = {
        "method": request.method,
        "url": str(request.url),
        "headers": dict(request.headers),
        "body": body,
        "client": request.client.host if request.client else "unknown"
    }

    logger.info("Debug request received", context=debug_info)
    return {
        "success": True,
        "debug_info": debug_info,
        "bridge_status": {
            "ready": is_ready,
            "trader_initialized": trader is not None,
            "last_error": last_error
        }
    }


# Run the server
if __name__ == "__main__":
    try:
        port = int(os.getenv("XTB_BRIDGE_PORT", "8003"))
        logger.info(f"Starting XTB Bridge API on port {port}")
        logger.info(f"Python version: {sys.version}")

        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Failed to start XTB Bridge: {e}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        sys.exit(1)