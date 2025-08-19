#!/bin/bash
cd /Users/anudeepn/Documents/email-automation-system
echo "Starting server in background..."
nohup /opt/homebrew/bin/node server.js > server.log 2>&1 &
echo $! > server.pid
echo "Server started with PID: $(cat server.pid)"
echo "Logs: tail -f server.log"