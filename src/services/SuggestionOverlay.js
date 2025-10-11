const { screen, BrowserWindow } = require('electron');
const path = require('path');

class SuggestionOverlay {
  constructor() {
    this.overlayWindow = null;
    this.isVisible = false;
    this.currentSuggestions = null;
    this.callback = null;
  }

  showSuggestions(suggestions, originalText, callback) {
    // Close any existing overlay first
    this.hide();
    
    // Debug: Log what we're receiving
    console.log('🎯 SuggestionOverlay received:');
    console.log('📝 Original text:', originalText);
    console.log('✨ Suggestions:', JSON.stringify(suggestions, null, 2));
    
    this.currentSuggestions = suggestions;
    this.callback = callback;
    
    // Create overlay window
    this.createOverlayWindow();
    
    // Position it near the cursor
    this.positionOverlay();
    
    // Send suggestions to overlay
    const dataToSend = {
      suggestions: suggestions,
      originalText: originalText
    };
    
    console.log('📤 Sending to overlay window:', JSON.stringify(dataToSend, null, 2));
    
    // Wait for the window to be ready before sending data
    this.overlayWindow.webContents.once('did-finish-load', () => {
      console.log('📡 Overlay window loaded, sending suggestions...');
      this.overlayWindow.webContents.send('show-suggestions', dataToSend);
      
      // Show the window after sending data
      this.overlayWindow.show();
      this.overlayWindow.focus();
    });
    
    this.isVisible = true;
  }

  createOverlayWindow() {
    // Ensure any existing window is properly closed
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
      this.overlayWindow = null;
    }

    this.overlayWindow = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: true,
        show: false, // Don't show immediately
        webPreferences: {
          nodeIntegration: true,
        contextIsolation: false
      }
    });

    this.overlayWindow.loadFile('src/renderer/overlay.html');
    
    // Handle overlay events
    this.overlayWindow.webContents.on('ipc-message', (event, channel, data) => {
      if (channel === 'accept-suggestion') {
        this.handleAcceptSuggestion(data);
      } else if (channel === 'ignore-suggestion') {
        this.handleIgnoreSuggestion();
      } else if (channel === 'apply-individual') {
        this.handleApplyIndividual(data);
      }
    });

    this.overlayWindow.on('closed', () => {
      this.isVisible = false;
      this.overlayWindow = null;
    });
  }

  positionOverlay() {
    const cursor = screen.getCursorScreenPoint();
    const displays = screen.getAllDisplays();
    const currentDisplay = screen.getDisplayNearestPoint(cursor);
    
    const x = Math.max(10, Math.min(cursor.x + 20, currentDisplay.bounds.width - 410));
    const y = Math.max(10, Math.min(cursor.y + 20, currentDisplay.bounds.height - 310));
    
    this.overlayWindow.setPosition(Math.round(x), Math.round(y));
    this.overlayWindow.show();
  }

  handleAcceptSuggestion(data) {
    if (this.callback) {
      this.callback('accept', data);
    }
    this.hide();
  }

  handleIgnoreSuggestion() {
    if (this.callback) {
      this.callback('ignore', null);
    }
    this.hide();
  }

  handleApplyIndividual(data) {
    if (this.callback) {
      this.callback('apply-individual', data);
    }
    this.hide();
  }

  hide() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
    }
    this.overlayWindow = null;
    this.isVisible = false;
  }

  isShowing() {
    return this.isVisible && this.overlayWindow && !this.overlayWindow.isDestroyed();
  }
}

module.exports = SuggestionOverlay;
