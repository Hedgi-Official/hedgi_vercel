import os
import json
import logging
from sys import path
from os.path import dirname, join, abspath
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Add the current directory to Python path to find the modules
current_dir = dirname(abspath(__file__))
path.append(current_dir)

from XTBTrader import XTBTrader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Create FastAPI app with CORS support
app = FastAPI(title="XTB Trading Bridge")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global trader instance
xtb_trader = None

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

class SymbolRequest(BaseModel):
    symbol: str

@app.on_event("startup")
async def startup_event():
    logger.info("Starting XTB Bridge API...")
    # Log Python and dependencies versions
    import sys
    logger.info(f"Python version: {sys.version}")

@app.get("/ping")
async def ping():
    logger.info("Ping endpoint called")
    return {"message": "pong", "status": "XTB Bridge is running"}

@app.post("/connect")
async def connect(request: LoginRequest):
    global xtb_trader
    try:
        logger.info("Attempting to connect to XTB API...")
        xtb_trader = XTBTrader()
        response = xtb_trader.connect(request.userId, request.password)

        if not response["success"]:
            logger.error(f"Login failed: {response.get('error')}")
            raise HTTPException(status_code=401, detail=response["error"])

        logger.info("Successfully connected to XTB API")
        return response

    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trade")
async def place_trade(request: TradeRequest):
    if not xtb_trader:
        raise HTTPException(status_code=400, detail="Not connected to XTB API")

    try:
        logger.info(f"Placing trade: {request.symbol}, volume: {request.volume}")

        if request.orderType == 0:  # OPEN
            # Construct trade transaction info according to XTB documentation
            trade_info = {
                "cmd": request.command,  # 0 for BUY, 1 for SELL
                "symbol": request.symbol,
                "volume": request.volume,
                "type": request.orderType,  # 0 for OPEN
                "price": getattr(request, 'price', 0.0),  # Use market price if 0
                "sl": getattr(request, 'sl', 0.0),  # Stop loss
                "tp": getattr(request, 'tp', 0.0),  # Take profit
                "customComment": getattr(request, 'customComment', f"Hedge position for {request.symbol}")
            }
            response = xtb_trader.execute_transaction(trade_info)
        else:  # CLOSE
            if request.order is None:
                raise HTTPException(status_code=400, detail="Order ID required for closing trades")
            
            # Construct trade transaction info for closing
            trade_info = {
                "cmd": request.command,  # For close, we use the same direction
                "symbol": request.symbol,
                "volume": request.volume,
                "type": 2,  # 2 for CLOSE
                "price": getattr(request, 'price', 0.0),  # Use market price if 0
                "order": request.order  # Required for closing specific position
            }
            response = xtb_trader.execute_transaction(trade_info)

        if not response["success"]:
            raise HTTPException(status_code=400, detail=response["error"])

        logger.info(f"Trade response: {response}")
        return response

    except Exception as e:
        logger.error(f"Trade error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/symbol")
async def get_symbol(request: SymbolRequest):
    if not xtb_trader:
        raise HTTPException(status_code=400, detail="Not connected to XTB API")

    try:
        logger.info(f"Getting symbol data for: {request.symbol}")
        response = xtb_trader.client.commandExecute('getSymbol', {'symbol': request.symbol})

        if not response.get('status'):
            error_msg = f"Failed to get symbol data: {response.get('errorCode')} - {response.get('errorDescr', 'Unknown error')}"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)

        logger.info(f"Symbol data response: {response}")
        return response

    except Exception as e:
        logger.error(f"Get symbol data error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/status")
async def check_status(request: StatusRequest):
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
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/disconnect")
async def disconnect():
    global xtb_trader
    if xtb_trader:
        try:
            logger.info("Disconnecting from XTB API")
            response = xtb_trader.disconnect()
            xtb_trader = None
            return response
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    return {"success": True}

if __name__ == "__main__":
    port = int(os.environ.get("XTB_BRIDGE_PORT", "8000"))
    logger.info(f"Starting XTB Bridge API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
