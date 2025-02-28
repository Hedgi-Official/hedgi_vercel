from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from typing import Optional
from .xtb_trader import XTBTrader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s][%(name)s][%(levelname)s] %(message)s'
)
logger = logging.getLogger('xtb_bridge')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global trader instance
trader: Optional[XTBTrader] = None
trader_initialized = False

def get_trader():
    global trader, trader_initialized
    try:
        if not trader_initialized:
            # Get credentials from environment variables
            user_id = os.getenv('XTB_USER_ID')
            password = os.getenv('XTB_PASSWORD')

            if not user_id or not password:
                raise ValueError("XTB credentials not found in environment variables")

            logger.info("Initializing XTB trader...")
            trader = XTBTrader(user_id, password)
            trader_initialized = True

        if trader and not hasattr(trader, 'client') or trader.client is None:
            logger.info("Connecting to XTB...")
            if not trader.connect():
                raise ConnectionError("Failed to connect to XTB")
            logger.info("Successfully connected to XTB")

        return trader
    except Exception as e:
        logger.error(f"Error initializing trader: {str(e)}")
        raise

@app.route('/api/trade', methods=['POST'])
def place_trade():
    try:
        data = request.json
        logger.info(f"Received trade request for symbol: {data.get('symbol')}")

        required_fields = ['symbol', 'volume', 'price', 'isBuy']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        trader = get_trader()
        order_number = trader.place_trade(
            symbol=data['symbol'],
            volume=float(data['volume']),
            price=float(data['price']),
            is_buy=data['isBuy'],
            custom_comment=data.get('customComment', '')
        )

        if order_number is not None:
            logger.info(f"Trade placed successfully. Order number: {order_number}")
            return jsonify({'status': 'success', 'orderNumber': order_number})
        else:
            logger.error("Failed to place trade")
            return jsonify({'error': 'Failed to place trade'}), 500
    except Exception as e:
        logger.error(f"Error placing trade: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/trade/status/<int:order_number>', methods=['GET'])
def check_trade_status(order_number):
    try:
        logger.info(f"Checking status for order: {order_number}")
        trader = get_trader()
        status = trader.check_trade_status(order_number)
        logger.info(f"Status retrieved for order {order_number}: {status}")
        return jsonify(status)
    except Exception as e:
        logger.error(f"Error checking trade status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/trade/close', methods=['POST'])
def close_trade():
    try:
        data = request.json
        logger.info(f"Received close trade request for order: {data.get('orderNumber')}")

        required_fields = ['orderNumber', 'symbol', 'volume', 'isBuy']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        trader = get_trader()
        close_order = trader.close_trade(
            order=int(data['orderNumber']),
            symbol=data['symbol'],
            volume=float(data['volume']),
            is_buy=data['isBuy'],
            price=float(data['price']) if 'price' in data else None
        )

        if close_order is not None:
            logger.info(f"Trade closed successfully. Close order number: {close_order}")
            return jsonify({'status': 'success', 'closeOrderNumber': close_order})
        else:
            logger.error("Failed to close trade")
            return jsonify({'error': 'Failed to close trade'}), 500
    except Exception as e:
        logger.error(f"Error closing trade: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    try:
        is_initialized = trader_initialized
        is_connected = trader and hasattr(trader, 'client') and trader.client is not None

        return jsonify({
            'status': 'healthy',
            'initialized': is_initialized,
            'connected': is_connected
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Use port 5001 to avoid conflict with Express server
    logger.info("Starting XTB bridge server on port 5001...")
    app.run(host='0.0.0.0', port=5001)