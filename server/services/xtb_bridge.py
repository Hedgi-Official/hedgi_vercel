import os
import json
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from XTBTrader import XTBTrader

# Enhanced logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="XTB Trading Bridge")

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

@app.post("/connect")
async def connect(request: LoginRequest):
    global xtb_trader
    try:
        logger.info("Attempting to connect to XTB API...")
        xtb_trader = XTBTrader()
        response = xtb_trader.connect(request.userId, request.password)

        if not response["success"]:
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
        logger.error(f"Trade error: {str(e)}")
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