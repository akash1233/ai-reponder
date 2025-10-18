const { screen, BrowserWindow } = require('electron');
const path = require('path');

class SuggestionOverlay {
  constructor() {
    this.overlayWindow = null;
    this.isVisible = false;
    this.currentSuggestions = null;
    this.callback = null;
    this.isAnimating = false;
    this.animationTimeout = null;
    this.positionCache = { x: 0, y: 0, display: null };
  }

  showSuggestions(suggestions, originalText, callback) {
    // Prevent multiple rapid calls
    if (this.isAnimating) {
      return;
    }
    
    this.isAnimating = true;
    this.currentSuggestions = suggestions;
    this.callback = callback;
    
    // Reuse existing window or create new one
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      this.createOverlayWindow();
    }
    
    // Position overlay with smart positioning
    this.positionOverlay();
    
    // Send suggestions to overlay
    const dataToSend = {
      suggestions: suggestions,
      originalText: originalText
    };
    
    // Use existing window or wait for new one to load
    if (this.overlayWindow.webContents.isLoading()) {
      this.overlayWindow.webContents.once('did-finish-load', () => {
        this.displaySuggestions(dataToSend);
      });
    } else {
      this.displaySuggestions(dataToSend);
    }
  }
  
  displaySuggestions(dataToSend) {
    this.overlayWindow.webContents.send('show-suggestions', dataToSend);
    
    // Show with animation
    this.overlayWindow.show();
    this.overlayWindow.focus();
    
    // Send animation command
    this.overlayWindow.webContents.send('animate-in');
    
    this.isVisible = true;
    this.isAnimating = false;
  }

  createOverlayWindow() {
    // Only create if we don't have a valid window
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      return;
    }

    this.overlayWindow = new BrowserWindow({
      width: 420,
      height: 320,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: true,
      show: false,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false,
        backgroundThrottling: false
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
      this.isAnimating = false;
    });
  }

  positionOverlay() {
    const cursor = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursor);
    const windowWidth = 420;
    const windowHeight = 320;
    
    // Smart positioning with better edge detection
    let x = cursor.x + 20;
    let y = cursor.y + 20;
    
    // Check if we need to flip horizontally
    if (x + windowWidth > currentDisplay.bounds.x + currentDisplay.bounds.width) {
      x = cursor.x - windowWidth - 20;
    }
    
    // Check if we need to flip vertically
    if (y + windowHeight > currentDisplay.bounds.y + currentDisplay.bounds.height) {
      y = cursor.y - windowHeight - 20;
    }
    
    // Ensure we stay within display bounds
    x = Math.max(currentDisplay.bounds.x + 10, Math.min(x, currentDisplay.bounds.x + currentDisplay.bounds.width - windowWidth - 10));
    y = Math.max(currentDisplay.bounds.y + 10, Math.min(y, currentDisplay.bounds.y + currentDisplay.bounds.height - windowHeight - 10));
    
    // Cache position for potential reuse
    this.positionCache = { x, y, display: currentDisplay.id };
    
    this.overlayWindow.setPosition(Math.round(x), Math.round(y));
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
    if (this.isAnimating) {
      return;
    }
    
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.isAnimating = true;
      
      // Send animation command before closing
      this.overlayWindow.webContents.send('animate-out');
      
      // Delay closing to allow animation
      this.animationTimeout = setTimeout(() => {
        this.overlayWindow.close();
        this.overlayWindow = null;
        this.isVisible = false;
        this.isAnimating = false;
      }, 200); // Match CSS animation duration
    } else {
      this.isVisible = false;
      this.isAnimating = false;
    }
  }

  isShowing() {
    return this.isVisible && this.overlayWindow && !this.overlayWindow.isDestroyed();
  }
}

module.exports = SuggestionOverlay;
