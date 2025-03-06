#!/bin/bash

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Define the base URL for the Flask server
XTB_SERVER="http://3.147.6.168"

# Define common trade parameters
SYMBOL="EURUSD"
VOLUME="0.1"

echo -e "${BLUE}===== XTB Trading API Test =====${NC}"

# Step 1: Login to get session
echo -e "\n${YELLOW}Step 1: Authenticating with XTB API${NC}"
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId": 17535100, "password": "GuiZarHoh2711!"}' \
  "${XTB_SERVER}/login")

echo -e "${CYAN}Login Response:${NC}"
echo $LOGIN_RESPONSE | jq '.'

# Check if login was successful
if [[ $LOGIN_RESPONSE == *"\"status\":true"* ]]; then
    echo -e "${GREEN}Login successful!${NC}"
else
    echo -e "${RED}Login failed. Aborting tests.${NC}"
    exit 1
fi

# Step 2: Open a trade
echo -e "\n${YELLOW}Step 2: Opening a trade${NC}"
OPEN_TRADE_PAYLOAD='{
  "commandName": "tradeTransaction", 
  "arguments": {
    "tradeTransInfo": {
      "cmd": 0, 
      "symbol": "'$SYMBOL'", 
      "volume": '$VOLUME', 
      "price": 1.0, 
      "offset": 0, 
      "order": 0,
      "type": 0,
      "customComment": "Test trade from script"
    }
  }
}'

echo -e "${CYAN}Open Trade Request:${NC}"
echo $OPEN_TRADE_PAYLOAD | jq '.'

OPEN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$OPEN_TRADE_PAYLOAD" \
  "${XTB_SERVER}/command")

echo -e "${CYAN}Open Trade Response:${NC}"
echo $OPEN_RESPONSE | jq '.'

# Extract order number for closing
if [[ $OPEN_RESPONSE == *"\"status\":true"* ]]; then
    # Extract the order number using a regex
    if [[ $OPEN_RESPONSE =~ \"order\":([0-9]+) ]]; then
        ORDER_NUMBER=${BASH_REMATCH[1]}
        echo -e "${GREEN}Trade opened successfully with order number: ${ORDER_NUMBER}${NC}"
        
        # Step 3: Wait a moment before closing
        echo -e "\n${YELLOW}Waiting 5 seconds before closing the trade...${NC}"
        sleep 5
        
        # Step 4: Close the trade
        echo -e "\n${YELLOW}Step 3: Closing the trade${NC}"
        
        # Order number for closing is original order + 1
        CLOSE_ORDER_NUMBER=$((ORDER_NUMBER + 1))
        echo -e "${CYAN}Using close order number: ${CLOSE_ORDER_NUMBER} (original + 1)${NC}"
        
        CLOSE_TRADE_PAYLOAD='{
          "commandName": "tradeTransaction", 
          "arguments": {
            "tradeTransInfo": {
              "cmd": 0, 
              "symbol": "'$SYMBOL'", 
              "volume": '$VOLUME', 
              "price": 1.0, 
              "offset": 0, 
              "order": '$CLOSE_ORDER_NUMBER',
              "type": 2,
              "customComment": "Closing test trade"
            }
          }
        }'
        
        echo -e "${CYAN}Close Trade Request:${NC}"
        echo $CLOSE_TRADE_PAYLOAD | jq '.'
        
        CLOSE_RESPONSE=$(curl -s -X POST \
          -H "Content-Type: application/json" \
          -d "$CLOSE_TRADE_PAYLOAD" \
          "${XTB_SERVER}/command")
        
        echo -e "${CYAN}Close Trade Response:${NC}"
        echo $CLOSE_RESPONSE
        
        # Try to parse as JSON if possible
        echo $CLOSE_RESPONSE | jq '.' 2>/dev/null || echo -e "${YELLOW}Response is not valid JSON. It might be HTML.${NC}"
        
        # Check if close was successful by looking for success indicators
        if [[ $CLOSE_RESPONSE == *"\"status\":true"* ]] || [[ $CLOSE_RESPONSE == *"success"* ]] || [[ $CLOSE_RESPONSE == *"200 OK"* ]]; then
            echo -e "${GREEN}Trade closed successfully!${NC}"
        else
            echo -e "${RED}Failed to close the trade. Check response for details.${NC}"
        fi
    else
        echo -e "${RED}Could not extract order number from response. Cannot close trade.${NC}"
    fi
else
    echo -e "${RED}Failed to open trade. Cannot proceed with close test.${NC}"
fi

echo -e "\n${BLUE}===== Test Completed =====${NC}"