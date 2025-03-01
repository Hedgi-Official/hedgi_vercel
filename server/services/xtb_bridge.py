import os
import json
import logging
from sys import path
from os.path import dirname, join
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Add the directory containing xAPIConnector to Python path
path.append(join(dirname(__file__), '../../attached_assets'))
from xAPIConnector import APIClient, APIStreamClient

# Enhanced logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="XTB Trading Bridge")

# Global client instance
xtb_client = None

class LoginRequest(BaseModel):
    userId: str
    password: str

class TradeRequest(BaseModel):
    symbol: str
    volume: float
    command: int  # 0 for BUY, 1 for SELL
    orderType: int  # 0 for OPEN, 2 for CLOSE

class StatusRequest(BaseModel):
    orderId: int

@app.post("/connect")
async def connect(request: LoginRequest):
    global xtb_client
    try:
        logger.info("Attempting to connect to XTB API...")
        xtb_client = APIClient()
        login_response = xtb_client.execute({
            'command': 'login',
            'arguments': {
                'userId': request.userId,
                'password': request.password
            }
        })

        if not login_response.get('status'):
            error_msg = f"Login failed: {login_response.get('errorCode')}"
            logger.error(error_msg)
            raise HTTPException(status_code=401, detail=error_msg)

        logger.info("Successfully connected to XTB API")
        return {'success': True, 'sessionId': login_response['streamSessionId']}
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trade")
async def place_trade(request: TradeRequest):
    if not xtb_client:
        raise HTTPException(status_code=400, detail="Not connected to XTB API")

    try:
        logger.info(f"Placing trade: {request.symbol}, volume: {request.volume}")
        trade_response = xtb_client.execute({
            'command': 'tradeTransaction',
            'arguments': {
                'tradeTransInfo': {
                    'cmd': request.command,
                    'symbol': request.symbol,
                    'volume': request.volume,
                    'type': request.orderType,
                    'price': 0.0  # Market price
                }
            }
        })

        logger.info(f"Trade response: {trade_response}")
        return {'success': True, 'response': trade_response}
    except Exception as e:
        logger.error(f"Trade error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/status")
async def check_status(request: StatusRequest):
    if not xtb_client:
        raise HTTPException(status_code=400, detail="Not connected to XTB API")

    try:
        logger.info(f"Checking status for order: {request.orderId}")
        status_response = xtb_client.execute({
            'command': 'tradeTransactionStatus',
            'arguments': {
                'order': request.orderId
            }
        })

        logger.info(f"Status response: {status_response}")
        return {'success': True, 'status': status_response}
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/disconnect")
async def disconnect():
    global xtb_client
    if xtb_client:
        try:
            logger.info("Disconnecting from XTB API")
            xtb_client.disconnect()
            xtb_client = None
            return {'success': True}
        except Exception as e:
            logger.error(f"Disconnect error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    return {'success': True}

if __name__ == "__main__":
    port = int(os.environ.get("XTB_BRIDGE_PORT", "8000"))
    logger.info(f"Starting XTB Bridge API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)