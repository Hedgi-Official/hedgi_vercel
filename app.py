
from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import os
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='[%(asctime)-15s][%(name)s][%(levelname)s] %(message)s')
logger = logging.getLogger("app")

# Make sure the attached_assets directory is in the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'attached_assets'))

# Import XTB trader
from server.python.xtb_trader import xtb_trader

app = Flask(__name__)
CORS(app)

@app.route('/symbol_info')
def symbol_info():
    # Your existing logic here
    return jsonify({
        "ask": 5.8178,
        "bid": 5.8149,
        "swap_long": -58.99,
        "swap_short": 11.97,
        "symbol": "USDBRL"
    })

@app.route('/xtb_health')
def xtb_health():
    """Check XTB connection health"""
    status = xtb_trader.get_status()
    return jsonify(status)

@app.route('/xtb_connect', methods=['POST'])
def xtb_connect():
    """Connect to XTB API"""
    credentials = request.json
    if not credentials:
        return jsonify({"success": False, "error": "Missing credentials"}), 400
    
    result = xtb_trader.connect(credentials)
    return jsonify(result)

@app.route('/xtb_disconnect', methods=['POST'])
def xtb_disconnect():
    """Disconnect from XTB API"""
    result = xtb_trader.disconnect()
    return jsonify(result)

@app.route('/xtb_symbol_info/<symbol>', methods=['GET'])
def xtb_symbol_info(symbol):
    """Get information about a symbol"""
    result = xtb_trader.get_symbol_info(symbol)
    return jsonify(result)

@app.route('/xtb_currency_pairs', methods=['GET'])
def xtb_currency_pairs():
    """Get all available currency pairs"""
    result = xtb_trader.get_currency_pairs()
    return jsonify(result)

@app.route('/xtb_place_trade', methods=['POST'])
def xtb_place_trade():
    """Place a trade with XTB"""
    trade_data = request.json
    if not trade_data:
        return jsonify({"success": False, "error": "Missing trade data"}), 400
    
    result = xtb_trader.place_trade(trade_data)
    return jsonify(result)

@app.route('/xtb_trade_status/<int:order_id>', methods=['GET'])
def xtb_trade_status(order_id):
    """Check the status of a trade"""
    result = xtb_trader.check_trade_status(order_id)
    return jsonify(result)

@app.route('/xtb_open_trades', methods=['GET'])
def xtb_open_trades():
    """Get all open trades"""
    result = xtb_trader.get_open_trades()
    return jsonify(result)

@app.route('/xtb_close_trade/<int:position_id>', methods=['POST'])
def xtb_close_trade(position_id):
    """Close an open trade"""
    result = xtb_trader.close_trade(position_id)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
