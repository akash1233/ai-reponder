#!/bin/bash

# Create a desktop shortcut for AI Reponder
APP_NAME="AI Reponder"
SCRIPT_PATH="/Users/ds/ai-reponser/start-app.sh"
DESKTOP_PATH="$HOME/Desktop/AI Reponder.command"

# Create the startup script
cat > "$SCRIPT_PATH" << 'EOF'
#!/bin/bash
cd /Users/ds/ai-reponser
echo "Starting AI Reponder..."
echo "Make sure you have added your API keys in Settings!"
npm start
EOF

# Make the script executable
chmod +x "$SCRIPT_PATH"

# Create the desktop shortcut
cat > "$DESKTOP_PATH" << EOF
#!/bin/bash
/Users/ds/ai-reponser/launch-app.sh
EOF

# Make the desktop shortcut executable
chmod +x "$DESKTOP_PATH"

echo "Desktop icon created at: $DESKTOP_PATH"
echo "You can now double-click 'AI Reponder.command' on your desktop to start the app!"
echo ""
echo "✅ AI Reponder is ready to use!"
echo "✅ Perplexity API key is hardcoded - no setup needed"
echo "✅ Gemini API is disabled - using Perplexity only"
echo ""
echo "How to use:"
echo "1. Type text in any app (Slack, Gmail, etc.)"
echo "2. Copy the text (Cmd+C)"
echo "3. See AI suggestions in the app window"
echo "4. Click 'Apply This Suggestion' to use improved text"

