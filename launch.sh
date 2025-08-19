#!/bin/bash

# Quick launch script for Email Automation System
# Use this after initial setup to quickly start the application

echo "📧 Launching Email Automation System..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not found. Running setup first..."
    ./setup.sh
    exit 0
fi

# Start the server using homebrew node
echo "🚀 Starting server..."
/opt/homebrew/bin/node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Open browser
if command -v open &> /dev/null; then
    open http://localhost:3000
    echo "✅ Application opened in browser"
else
    echo "📱 Please open http://localhost:3000 in your browser"
fi

echo "🔧 Server running on http://localhost:3000"
echo "Press Ctrl+C to stop..."

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping server...'; kill $SERVER_PID; exit 0" INT
wait $SERVER_PID