#!/bin/bash

# Launch AI Reponder
cd /Users/ds/ai-reponser

# Check if the app is already running
if pgrep -f "electron.*ai-reponser" > /dev/null; then
    echo "AI Reponder is already running!"
    echo "Look for the app window or check your system tray."
    exit 0
fi

echo "Starting AI Reponder..."

# Check environment setup
./check-env.sh
if [ $? -ne 0 ]; then
    echo "❌ Environment setup incomplete. Please fix the issues above and try again."
    exit 1
fi

echo ""

# Start the app
npm start

echo ""
echo "App started! Look for the AI Reponder window."
