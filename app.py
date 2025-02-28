
from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Default XTB credentials
XTB_USER_ID = os.environ.get('XTB_USER_ID', '17535100')
XTB_PASSWORD = os.environ.get('XTB_PASSWORD', 'GuiZarHoh2711!')

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

@app.route('/credentials', methods=['GET'])
def get_credentials():
    return jsonify({
        "userId": XTB_USER_ID,
        "password": XTB_PASSWORD
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
@app.route('/xtb_health')
def xtb_health():
    """Check XTB connection health"""
    try:
        from server.services.xtb_bridge import XTBBridge
        
        # Create a temporary bridge to check connection
        bridge = XTBBridge()
        status = asyncio.run(bridge.connect({
            "userId": XTB_USER_ID,
            "password": XTB_PASSWORD
        }))
        
        # Properly disconnect after health check
        bridge.disconnect()
        
        return jsonify({
            "healthy": status.get("status", False),
            "message": "XTB connection working" if status.get("status", False) else status.get("error", "Unknown error")
        })
    except Exception as e:
        return jsonify({
            "healthy": False,
            "message": f"XTB health check error: {str(e)}"
        }), 500
