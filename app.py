from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import asyncio
import logging
from server.python.main import (
    init_trader, get_symbol_data, execute_trade, 
    get_open_trades, close_trade, subscribe_to_prices,
    get_latest_prices, disconnect
)
from server.python.xtb_trader import OPERATION_BUY, OPERATION_SELL

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('XTB-Flask-API')

app = Flask(__name__)
CORS(app)

# Default XTB credentials
XTB_USER_ID = os.environ.get('XTB_USER_ID', '17535100')
XTB_PASSWORD = os.environ.get('XTB_PASSWORD', 'GuiZarHoh2711!')

# Initialize trader on startup
@app.before_first_request
def initialize_trader():
    logger.info("Initializing XTB trader")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(init_trader())

@app.route('/api/xtb/symbol/<symbol>', methods=['GET'])
def symbol_info(symbol):
    """Get information about a specific symbol"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    response = loop.run_until_complete(get_symbol_data(symbol))

    if response.get("status"):
        return jsonify({
            "status": True,
            "data": response.get("returnData", {})
        })
    else:
        return jsonify({
            "status": False,
            "error": response.get("errorDescr", "Unknown error")
        }), 400

@app.route('/api/xtb/trade', methods=['POST'])
def execute_new_trade():
    """Execute a new trade"""
    data = request.json

    # Validate required fields
    required_fields = ["symbol", "operation", "volume"]
    for field in required_fields:
        if field not in data:
            return jsonify({
                "status": False,
                "error": f"Missing required field: {field}"
            }), 400

    # Parse operation type
    operation_map = {
        "buy": OPERATION_BUY,
        "sell": OPERATION_SELL
    }
    operation = operation_map.get(data.get("operation").lower())
    if operation is None:
        return jsonify({
            "status": False,
            "error": "Invalid operation type. Use 'buy' or 'sell'."
        }), 400

    # Execute the trade
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    response = loop.run_until_complete(execute_trade(
        symbol=data.get("symbol"),
        operation=operation,
        volume=float(data.get("volume")),
        comment=data.get("comment", ""),
        custom_comment=data.get("customComment", ""),
        stop_loss=float(data.get("stopLoss", 0)),
        take_profit=float(data.get("takeProfit", 0))
    ))

    if response.get("status"):
        return jsonify({
            "status": True,
            "data": response.get("returnData", {})
        })
    else:
        return jsonify({
            "status": False,
            "error": response.get("errorDescr", "Unknown error")
        }), 400

@app.route('/api/xtb/trades', methods=['GET'])
def get_trades():
    """Get all open trades"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    response = loop.run_until_complete(get_open_trades())

    if response.get("status"):
        return jsonify({
            "status": True,
            "data": response.get("returnData", [])
        })
    else:
        return jsonify({
            "status": False,
            "error": response.get("errorDescr", "Unknown error")
        }), 400

@app.route('/api/xtb/trade/<int:trade_id>', methods=['DELETE'])
def close_existing_trade(trade_id):
    """Close an existing trade"""
    volume = request.args.get("volume", 0)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    response = loop.run_until_complete(close_trade(trade_id, float(volume) if volume else 0))

    if response.get("status"):
        return jsonify({
            "status": True,
            "data": response.get("returnData", {})
        })
    else:
        return jsonify({
            "status": False,
            "error": response.get("errorDescr", "Unknown error")
        }), 400

@app.route('/api/xtb/prices', methods=['GET'])
def get_prices():
    """Get latest prices for all subscribed symbols"""
    # Define symbols to subscribe if not already subscribed
    symbols = request.args.get("symbols", "USDBRL,EURUSD,USDMXN").split(",")

    for symbol in symbols:
        subscribe_to_prices(symbol)

    return jsonify({
        "status": True,
        "data": get_latest_prices()
    })

@app.route('/api/xtb/connect', methods=['POST'])
def connect_to_xtb():
    """Explicitly connect to XTB"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    trader = loop.run_until_complete(init_trader())

    if trader and trader.is_connected:
        return jsonify({
            "status": True,
            "message": "Connected to XTB successfully"
        })
    else:
        return jsonify({
            "status": False,
            "error": "Failed to connect to XTB"
        }), 500

@app.route('/api/xtb/disconnect', methods=['POST'])
def disconnect_from_xtb():
    """Explicitly disconnect from XTB"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(disconnect())

    return jsonify({
        "status": True,
        "message": "Disconnected from XTB"
    })

@app.route('/credentials', methods=['GET'])
def get_credentials():
    """Get XTB credentials"""
    return jsonify({
        "userId": XTB_USER_ID,
        "password": XTB_PASSWORD
    })

@app.route('/xtb_health')
def xtb_health():
    """Check XTB connection health"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    trader = loop.run_until_complete(init_trader())

    if trader and trader.is_connected:
        return jsonify({
            "status": True,
            "connected": True,
            "message": "XTB connection is healthy"
        })
    else:
        return jsonify({
            "status": False,
            "connected": False,
            "message": "Not connected to XTB"
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)