
#!/bin/bash
set -e

echo "Setting up Python bridge environment..."

# Ensure attached_assets directory is accessible
echo "Checking attached_assets directory..."
if [ -d "attached_assets" ]; then
  echo "Found attached_assets directory"
  ls -la attached_assets
else
  echo "attached_assets directory not found!"
  exit 1
fi

# Ensure XTBTrader.py and xAPIConnector.py are present
if [ ! -f "attached_assets/XTBTrader.py" ]; then
  echo "XTBTrader.py not found in attached_assets!"
  exit 1
fi

if [ ! -f "attached_assets/xAPIConnector.py" ]; then
  echo "xAPIConnector.py not found in attached_assets!"
  exit 1
fi

# Copy files to server/services directory for easier importing
echo "Copying Python files to server/services directory..."
cp attached_assets/XTBTrader.py server/services/
cp attached_assets/xAPIConnector.py server/services/

# Make the Python bridge executable
chmod +x server/services/xtb_bridge.py

# Install any required Python packages
pip install fastapi uvicorn pydantic

echo "Setup complete. You can now run the application."
