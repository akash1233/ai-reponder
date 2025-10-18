#!/bin/bash

echo "Looking for AI Reponder..."

# Check if the app is running
if pgrep -f "electron.*ai-reponder" > /dev/null; then
    echo "✅ AI Reponder is running!"
    echo ""
    echo "The app window might be hidden. Try these steps:"
    echo ""
    echo "1. Look in your system tray (top menu bar) for the app icon"
    echo "2. Press Cmd + Tab to cycle through open applications"
    echo "3. Look for 'AI Reponder' or 'Electron' in the app switcher"
    echo "4. Check Mission Control (swipe up with 3 fingers) to see all windows"
    echo "5. Look in your Dock for the app icon"
    echo ""
    echo "If you still can't find it, the window might be minimized or hidden."
    echo "Try clicking on any Electron app icon you see in the app switcher."
    echo ""
    
    # Try to bring the app to front using AppleScript
    echo "Attempting to bring the app window to front..."
    osascript -e 'tell application "Electron" to activate' 2>/dev/null || echo "Could not activate Electron app"
    
else
    echo "❌ AI Reponder is not running."
    echo "Starting the app now..."
    cd /Users/ds/ai-reponser
    npm start &
    echo "App started! Look for the window."
fi
