#!/bin/bash

# Create a desktop shortcut for AI Responder
APP_NAME="AI Responder"
APP_DIR="/Users/ds/ai-responder"
SCRIPT_PATH="$APP_DIR/start-app.sh"
DESKTOP_PATH="$HOME/Desktop/AI Responder.command"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: App directory not found at $APP_DIR"
    echo "Please make sure the AI Responder app is installed in the correct location."
    exit 1
fi

# Create the startup script
cat > "$SCRIPT_PATH" << 'EOF'
#!/bin/bash
cd /Users/ds/ai-responder
echo "Starting AI Responder..."
echo "Make sure you have added your API keys in Settings!"
npm start
EOF

# Make the script executable
chmod +x "$SCRIPT_PATH"

# Create the desktop shortcut
cat > "$DESKTOP_PATH" << EOF
#!/bin/bash
/Users/ds/ai-responder/start-app.sh
EOF

# Make the desktop shortcut executable
chmod +x "$DESKTOP_PATH"

echo "Desktop icon created at: $DESKTOP_PATH"
echo "You can now double-click 'AI Responder.command' on your desktop to start the app!"
echo ""
echo "✅ AI Responder is ready to use!"
echo "✅ Configure your API keys in the app Settings"
echo "✅ Supports both Perplexity and Gemini AI services"
echo ""
echo "How to use:"
echo "1. Type text in any app (Slack, Gmail, etc.)"
echo "2. Copy the text (Cmd+C)"
echo "3. See AI suggestions in the app window"
echo "4. Click 'Copy' or 'Copy+Replace' to use improved text"
echo ""
echo "First time setup:"
echo "1. Open the app and go to Settings"
echo "2. Add your Perplexity and/or Gemini API keys"
echo "3. Test the API keys to make sure they work"
echo "4. Start using the app!"

