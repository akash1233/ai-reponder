const { clipboard } = require('electron');
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
  }

  async start(callback) {
    this.callback = callback;
    this.isMonitoring = true;
    
    // Monitor clipboard changes
    this.startClipboardMonitoring();
    
    // Monitor active window changes
    this.startWindowMonitoring();
    
    console.log('Text monitoring started');
  }

  async stop() {
    this.isMonitoring = false;
    if (this.windowInterval) {
      clearInterval(this.windowInterval);
    }
    console.log('Text monitoring stopped');
  }

  startClipboardMonitoring() {
    const checkClipboard = async () => {
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
        console.error('Clipboard monitoring error:', error);
      }

      setTimeout(checkClipboard, 100); // Check every 100ms
    };

    checkClipboard();
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
    // Simple heuristic to determine if text was typed vs copied
    // Look for patterns that suggest typing vs copying
    return text.length > 10 && 
           text.length < 500 && 
           !text.includes('\n') && 
           text.trim().length > 0;
  }

  processText(text) {
    if (!text || text.length < 5) return;
    
    // Clean up the text
    const cleanText = text.trim();
    
    // Avoid processing the same text multiple times
    if (cleanText === this.currentText) return;
    
    this.currentText = cleanText;
    
    // Call the callback with the detected text
    if (this.callback) {
      this.callback(cleanText);
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
