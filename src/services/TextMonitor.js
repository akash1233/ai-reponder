const { clipboard, globalShortcut } = require('electron');
// const activeWin = require('active-win'); // Disabled to avoid permission issues

class TextMonitor {
  constructor() {
    this.isMonitoring = false;
    this.lastClipboard = '';
    this.currentText = '';
    this.textBuffer = '';
    this.lastKeyTime = 0;
    this.keyBuffer = [];
    this.maxBufferSize = 1000;
    this.callback = null;
    this.keyboardInterval = null;
    this.clipboardInterval = null;
    this.isTyping = false;
    this.typingTimeout = null;
    this.lastProcessedText = '';
    this.textHistory = [];
    this.maxHistorySize = 10;
  }

  async start(callback) {
    this.callback = callback;
    this.isMonitoring = true;
    
    // Only start clipboard monitoring - no continuous keystroke monitoring
    this.startClipboardMonitoring();
    
    console.log('Text monitoring started - use Cmd+Shift+C to analyze text');
  }

  async stop() {
    this.isMonitoring = false;
    
    // Clear all intervals
    if (this.windowInterval) {
      clearInterval(this.windowInterval);
      this.windowInterval = null;
    }
    if (this.keyboardInterval) {
      clearInterval(this.keyboardInterval);
      this.keyboardInterval = null;
    }
    if (this.clipboardInterval) {
      clearInterval(this.clipboardInterval);
      this.clipboardInterval = null;
    }
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    
    console.log('Enhanced text monitoring stopped');
  }

  startClipboardMonitoring() {
    // More efficient clipboard monitoring with better timing
    this.clipboardInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      try {
        const currentClipboard = clipboard.readText();
        
        if (currentClipboard !== this.lastClipboard && currentClipboard.length > 0) {
          this.lastClipboard = currentClipboard;
          
          // Check if this looks like text being typed (not just copied)
          if (this.isTypedText(currentClipboard)) {
            this.processText(currentClipboard);
          }
        }
      } catch (error) {
        // Silently handle clipboard errors to avoid spam
      }
    }, 200); // Check every 200ms for better performance
  }

  startWindowMonitoring() {
    // Simplified monitoring - just check clipboard periodically
    this.windowInterval = setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        // Check clipboard for new text that might have been typed
        await this.checkForNewText();
      } catch (error) {
        // Ignore errors, continue monitoring
      }
    }, 1000); // Check every 1 second
  }

  isTextInputContext(window) {
    const title = window.title.toLowerCase();
    const app = window.owner.name.toLowerCase();
    
    // Check for common text input applications
    const textApps = [
      'slack', 'discord', 'teams', 'zoom', 'skype',
      'chrome', 'safari', 'firefox', 'edge',
      'notion', 'obsidian', 'bear', 'typora',
      'textedit', 'notes', 'pages', 'word',
      'gmail', 'outlook', 'mail'
    ];
    
    return textApps.some(appName => 
      title.includes(appName) || app.includes(appName)
    );
  }

  async checkForNewText() {
    try {
      const currentClipboard = clipboard.readText();
      
      if (currentClipboard !== this.lastClipboard && 
          currentClipboard.length > 0 && 
          this.isTypedText(currentClipboard)) {
        
        this.lastClipboard = currentClipboard;
        this.processText(currentClipboard);
      }
    } catch (error) {
      // Ignore clipboard errors
    }
  }


  isTypedText(text) {
    if (!text || text.trim().length === 0) return false;
    
    // More sophisticated heuristics to determine if text was typed vs copied
    const cleanText = text.trim();
    
    // Length checks - typed text is usually shorter
    if (cleanText.length < 5 || cleanText.length > 1000) return false;
    
    // Check for common copy patterns
    if (cleanText.includes('\n') && cleanText.split('\n').length > 3) return false; // Multi-line content
    if (cleanText.includes('\t')) return false; // Tab characters suggest formatted content
    if (cleanText.match(/^[A-Z\s]+$/)) return false; // All caps might be headers
    if (cleanText.match(/^\d+$/)) return false; // Just numbers
    if (cleanText.match(/^[^\w\s]+$/)) return false; // Just symbols
    
    // Check for typing patterns
    const hasTypingPatterns = 
      cleanText.includes(' ') || // Has spaces (typical for sentences)
      cleanText.match(/[a-z]/) || // Has lowercase letters
      cleanText.match(/[.!?]/) || // Has sentence endings
      cleanText.match(/\b(?:the|and|or|but|in|on|at|to|for|of|with|by)\b/i); // Common words
    
    // Check if it's not in our recent history (avoid reprocessing)
    const isRecent = this.textHistory.some(history => 
      history.toLowerCase() === cleanText.toLowerCase()
    );
    
    if (isRecent) return false;
    
    // Add to history
    this.textHistory.push(cleanText);
    if (this.textHistory.length > this.maxHistorySize) {
      this.textHistory.shift();
    }
    
    return hasTypingPatterns;
  }

  processText(text) {
    if (!text || text.length < 5) return;
    
    // Clean up the text
    const cleanText = text.trim();
    
    // Avoid processing the same text multiple times
    if (cleanText === this.currentText) return;
    
    // Set typing state
    this.isTyping = true;
    this.currentText = cleanText;
    
    // Clear any existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Set a timeout to detect when typing stops
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
    }, 1000); // Consider typing stopped after 1 second of inactivity
    
    // Call the callback with the detected text
    if (this.callback) {
      this.callback(cleanText);
    }
  }

  startKeyboardMonitoring() {
    // Monitor keyboard input more frequently for smoother capture
    this.keyboardInterval = setInterval(() => {
      if (!this.isMonitoring) return;
      
      try {
        // Check for clipboard changes (indicates text selection/copy)
        const currentClipboard = clipboard.readText();
        if (currentClipboard && currentClipboard !== this.lastClipboard) {
          this.lastClipboard = currentClipboard;
          
          // Process if it looks like typed text
          if (this.isTypedText(currentClipboard)) {
            this.processText(currentClipboard);
          }
        }
        
        // Check for text changes using improved clipboard monitoring
        this.checkForTextChanges();
        
      } catch (error) {
        // Silently handle errors to avoid spam
      }
    }, 100); // Check every 100ms for better performance
  }

  checkForTextChanges() {
    try {
      // Improved text change detection without robotjs
      const currentTime = Date.now();
      
      // Only check if enough time has passed since last check
      if (currentTime - this.lastKeyTime < 200) return;
      
      this.lastKeyTime = currentTime;
      
      // Use a more sophisticated approach to detect text changes
      // This method focuses on clipboard monitoring with better heuristics
      const currentClipboard = clipboard.readText();
      
      // Check if clipboard content has changed and looks like typed text
      if (currentClipboard && 
          currentClipboard !== this.lastProcessedText && 
          this.isTypedText(currentClipboard)) {
        
        this.lastProcessedText = currentClipboard;
        this.processText(currentClipboard);
      }
      
    } catch (error) {
      // Silently handle errors to avoid spam
    }
  }

  async replaceText(originalText, newText) {
    try {
      // Store the original text for reference
      this.originalText = originalText;
      this.replacementText = newText;
      
      // Copy the new text to clipboard
      clipboard.writeText(newText);
      
      // Show a more helpful notification
      console.log(`✅ Text ready to paste!`);
      console.log(`📝 Original: "${originalText}"`);
      console.log(`✨ Improved: "${newText}"`);
      console.log(`📋 Press Cmd+V to paste the improved text`);
      
      // Return success with helpful information
      return {
        success: true,
        message: 'Text copied to clipboard! Press Cmd+V to paste.',
        originalText: originalText,
        newText: newText
      };
    } catch (error) {
      console.error('Error preparing text replacement:', error);
      return {
        success: false,
        message: 'Failed to copy text to clipboard',
        error: error.message
      };
    }
  }

  // Method to get current text from clipboard
  async getCurrentText() {
    try {
      return clipboard.readText();
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return '';
    }
  }
}

module.exports = TextMonitor;
