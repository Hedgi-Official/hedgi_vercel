
from flask import Flask, jsonify
from flask_cors import CORS

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
