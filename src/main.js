// Load environment variables
require('dotenv').config();

const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, clipboard, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');
const TextMonitor = require('./services/TextMonitor');
const AIService = require('./services/AIService');
const SlackIntegration = require('./services/SlackIntegration');
const SuggestionOverlay = require('./services/SuggestionOverlay');

class AIWritingAssistant {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.store = new Store();
    this.textMonitor = new TextMonitor();
    this.aiService = new AIService();
    this.slackIntegration = new SlackIntegration();
    this.suggestionOverlay = new SuggestionOverlay();
    this.isMonitoring = false;
    this.lastShortcutTime = 0;
    this.shortcutCooldown = 1000; // 1 second cooldown between shortcuts
    this.ipcHandlersRegistered = false; // Flag to prevent duplicate IPC registration
    this.registeredShortcuts = new Map(); // Track registered shortcuts
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 450,
      minWidth: 400,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      resizable: true,
      minimizable: true,
      maximizable: false,
      show: true,
      skipTaskbar: false,
      alwaysOnTop: false
    });

    this.mainWindow.loadFile('src/renderer/index.html');

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      console.log('AI Writing Assistant window is ready!');
    });

    // Don't hide window when it loses focus - keep it visible
    // this.mainWindow.on('blur', () => {
    //   this.mainWindow.hide();
    // });

    // Setup IPC handlers
    this.setupIPC();
  }

  createTray() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    this.tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Assistant',
        click: () => {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        }
      },
      {
        label: this.isMonitoring ? 'Stop Monitoring' : 'Start Monitoring',
        click: () => {
          this.toggleMonitoring();
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          this.showSettings();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('AI Writing Assistant');
    
    this.tray.on('click', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  setupIPC() {
    // Prevent duplicate IPC handler registration
    if (this.ipcHandlersRegistered) {
      console.log('IPC handlers already registered, skipping...');
      return;
    }
    
    console.log('Registering IPC handlers...');
    
    // API Key management
    ipcMain.handle('save-api-key', async (event, { service, key }) => {
      this.store.set(`apiKeys.${service}`, key);
      
      // Initialize the AI service with the new key
      if (service === 'gemini') {
        await this.aiService.initializeGemini(key);
      } else if (service === 'perplexity') {
        await this.aiService.initializePerplexity(key);
      }
      
      return { success: true };
    });

    ipcMain.handle('get-api-key', async (event, service) => {
      return this.store.get(`apiKeys.${service}`, '');
    });

    // New API keys handlers for UI
    ipcMain.handle('get-api-keys', async () => {
      const apiKeys = this.store.get('apiKeys', {});
      return {
        perplexity: apiKeys.perplexity || '',
        gemini: apiKeys.gemini || ''
      };
    });

    ipcMain.handle('save-api-keys', async (event, keys) => {
      try {
        this.store.set('apiKeys', keys);
        
        // Update environment variables for current session
        if (keys.perplexity) {
          process.env.PERPLEXITY_API_KEY = keys.perplexity;
          await this.aiService.initializePerplexity(keys.perplexity);
        }
        if (keys.gemini) {
          process.env.GEMINI_API_KEY = keys.gemini;
          await this.aiService.initializeGemini(keys.gemini);
        }
        
        console.log('API keys saved and initialized');
        return { success: true };
      } catch (error) {
        console.error('Error saving API keys:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('test-api-keys', async (event, keys) => {
      try {
        const results = {
          success: false,
          perplexity: null,
          gemini: null
        };

        // Test Perplexity key
        if (keys.perplexity) {
          try {
            const testService = new AIService();
            await testService.initializePerplexity(keys.perplexity);
            const testResult = await testService.getSuggestions('test', { provider: 'perplexity' });
            results.perplexity = { success: true, message: 'Perplexity API key is working' };
          } catch (error) {
            results.perplexity = { success: false, error: error.message };
          }
        }

        // Test Gemini key
        if (keys.gemini) {
          try {
            const testService = new AIService();
            await testService.initializeGemini(keys.gemini);
            const testResult = await testService.getSuggestions('test', { provider: 'gemini' });
            results.gemini = { success: true, message: 'Gemini API key is working' };
          } catch (error) {
            results.gemini = { success: false, error: error.message };
          }
        }

        // Overall success if at least one key works
        results.success = (results.perplexity && results.perplexity.success) || 
                         (results.gemini && results.gemini.success);

        return results;
      } catch (error) {
        console.error('Error testing API keys:', error);
        return { success: false, error: error.message };
      }
    });

    // Monitoring control
    ipcMain.handle('toggle-monitoring', async () => {
      return this.toggleMonitoring();
    });

    ipcMain.handle('get-monitoring-status', async () => {
      return this.isMonitoring;
    });

    // AI suggestions
    ipcMain.handle('get-suggestions', async (event, text) => {
      try {
        const suggestions = await this.aiService.getSuggestions(text);
        return { success: true, suggestions };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Text replacement
    ipcMain.handle('replace-text', async (event, { originalText, newText }) => {
      try {
        await this.textMonitor.replaceText(originalText, newText);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Settings
    ipcMain.handle('save-settings', async (event, settings) => {
      this.store.set('settings', settings);
      return { success: true };
    });

    ipcMain.handle('get-settings', async () => {
      return this.store.get('settings', {
        aiProvider: 'gemini',
        autoReplace: false,
        showSuggestions: true,
        grammarCheck: true,
        toneAdjustment: true
      });
    });

    // Shortcut management
    ipcMain.handle('update-shortcut', async (event, shortcut) => {
      try {
        this.store.set('shortcut', shortcut);
        
        // Update shortcut
        this.updateShortcut();
        
        return { success: true };
      } catch (error) {
        console.error('Error updating shortcut:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-shortcut', async () => {
      return this.store.get('shortcut', 'CommandOrControl+Shift+T');
    });

    // Prompts management
    ipcMain.handle('save-prompts', async (event, prompts) => {
      try {
        this.store.set('prompts', prompts);
        console.log('Prompts saved:', prompts);
        return { success: true };
      } catch (error) {
        console.error('Error saving prompts:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-prompts', async () => {
      return this.store.get('prompts', {
        activePrompt: 'professional',
        templates: {
          professional: 'Rewrite the message professionally, slick and without any ambiguity, keep it crisp and clean. Focus on clarity, conciseness, and professional tone while maintaining the original meaning.',
          casual: 'Rewrite this message in a more casual, friendly tone while keeping it clear and engaging. Make it sound natural and conversational.',
          creative: 'Rewrite this message with more creative and engaging language. Add personality and flair while maintaining clarity and impact.',
          technical: 'Rewrite this message with precise, technical language. Use industry terminology and maintain accuracy while improving clarity and structure.',
          custom: 'Rewrite the message according to your specific requirements...'
        }
      });
    });
    
    // Mark IPC handlers as registered
    this.ipcHandlersRegistered = true;
    console.log('IPC handlers registered successfully');
  }

  async toggleMonitoring() {
    // Monitoring is now only triggered by keyboard shortcuts
    // No automatic monitoring to avoid unwanted popups
    console.log('Text monitoring ready - use keyboard shortcuts to trigger analysis');
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('app-status', {
        message: 'Ready - Use Cmd+Shift+T to analyze text',
        type: 'ready'
      });
    }
    
    this.createTray();
    return true;
  }

  async handleTextInput(text) {
    if (!text || text.length < 10) return;

    // Prevent multiple simultaneous popups
    if (this.suggestionOverlay.isShowing()) {
      console.log('Overlay already showing, ignoring new request');
      return;
    }

    try {
      // Check if text is from Slack
      const isSlackText = await this.slackIntegration.isSlackText(text);
      
      // Get the active prompt template
      const prompts = this.store.get('prompts', {
        activePrompt: 'professional',
        templates: {
          professional: 'Rewrite the message professionally, slick and without any ambiguity, keep it crisp and clean. Focus on clarity, conciseness, and professional tone while maintaining the original meaning.',
          casual: 'Rewrite this message in a more casual, friendly tone while keeping it clear and engaging. Make it sound natural and conversational.',
          creative: 'Rewrite this message with more creative and engaging language. Add personality and flair while maintaining clarity and impact.',
          technical: 'Rewrite this message with precise, technical language. Use industry terminology and maintain accuracy while improving clarity and structure.',
          custom: 'Rewrite the message according to your specific requirements...'
        }
      });
      
      const promptTemplate = prompts.templates[prompts.activePrompt] || prompts.templates.professional;
      
      // Get AI suggestions (auto-detect provider)
      const suggestions = await this.aiService.getSuggestions(text, {
        isSlack: isSlackText,
        context: 'slack', // or 'general'
        provider: 'auto', // Auto-detect which API key to use
        promptTemplate: promptTemplate
      });

      // Debug: Log what we're sending to the overlay
      console.log('🎯 Sending to overlay:');
      console.log('📝 Original text:', text);
      console.log('✨ Suggestions:', JSON.stringify(suggestions, null, 2));
      
      // Show overlay with suggestions
      this.suggestionOverlay.showSuggestions(suggestions, text, (action, data) => {
        this.handleOverlayAction(action, data, text);
      });

      // Also send to main window for reference
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('text-suggestions', {
          originalText: text,
          suggestions: suggestions
        });
      }
    } catch (error) {
      console.error('Error handling text input:', error);
    }
  }

  handleOverlayAction(action, data, originalText) {
    switch (action) {
      case 'accept':
        // Copy the accepted suggestion to clipboard
        clipboard.writeText(data);
        console.log('✅ Suggestion accepted and copied to clipboard');
        
        // Send to main window for history
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('suggestion-accepted', {
            originalText: originalText,
            suggestion: data
          });
        }
        break;
      case 'apply-individual':
        // Copy individual suggestion to clipboard
        clipboard.writeText(data.suggested);
        console.log('✅ Individual suggestion applied and copied to clipboard');
        
        // Send to main window for history
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('suggestion-accepted', {
            originalText: data.original,
            suggestion: data.suggested
          });
        }
        break;
      case 'ignore':
        console.log('❌ Suggestion ignored');
        
        // Send to main window for history
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('suggestion-rejected', {
            originalText: originalText,
            suggestion: data || 'User rejected all suggestions'
          });
        }
        break;
    }
  }

  async autoCopyAndAnalyze() {
    // Check cooldown to prevent rapid-fire shortcuts
    const now = Date.now();
    if (now - this.lastShortcutTime < this.shortcutCooldown) {
      console.log('Shortcut cooldown active, ignoring request');
      return;
    }
    this.lastShortcutTime = now;

    try {
      // Store current clipboard content
      const previousClipboard = clipboard.readText();
      
      // Use AppleScript to select all and copy text from the current application
      const { exec } = require('child_process');
      
      const appleScript = `
        tell application "System Events"
          keystroke "a" using command down
          delay 0.1
          keystroke "c" using command down
        end tell
      `;
      
      exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
        if (error) {
          console.error('AppleScript error:', error);
          // Fallback: try to analyze current clipboard
          const currentText = clipboard.readText();
          if (currentText && currentText.trim().length > 0) {
            this.handleTextInput(currentText.trim());
          }
          return;
        }
        
        // Small delay to ensure copy operation completes
        setTimeout(() => {
          const currentText = clipboard.readText();
          
          // Check if we got new text (not the same as before)
          if (currentText && 
              currentText.trim().length > 0 && 
              currentText !== previousClipboard &&
              this.isValidTextForAnalysis(currentText)) {
            
            console.log('✅ Auto-copied text:', currentText.substring(0, 50) + '...');
            this.handleTextInput(currentText.trim());
          } else {
            console.log('❌ No valid text found to analyze');
          }
        }, 200);
      });
      
    } catch (error) {
      console.error('Error in autoCopyAndAnalyze:', error);
    }
  }

  isValidTextForAnalysis(text) {
    // Check if text is suitable for analysis
    const cleanText = text.trim();
    
    // Must be at least 5 characters
    if (cleanText.length < 5) return false;
    
    // Must not be just whitespace or special characters
    if (!cleanText.match(/[a-zA-Z]/)) return false;
    
    // Must not be too long (avoid copying entire documents)
    if (cleanText.length > 2000) return false;
    
    return true;
  }

  showSettings() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      this.mainWindow.focus();
      this.mainWindow.webContents.send('show-settings');
    }
  }

  // Dynamic shortcut management
  registerShortcut(shortcut, action) {
    try {
      // Unregister existing shortcut if it exists
      if (this.registeredShortcuts.has(shortcut)) {
        globalShortcut.unregister(shortcut);
      }
      
      // Register new shortcut
      const success = globalShortcut.register(shortcut, action);
      if (success) {
        this.registeredShortcuts.set(shortcut, action);
        console.log(`✅ Registered shortcut: ${shortcut}`);
        return true;
      } else {
        console.error(`❌ Failed to register shortcut: ${shortcut}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error registering shortcut ${shortcut}:`, error);
      return false;
    }
  }

  unregisterShortcut(shortcut) {
    try {
      if (this.registeredShortcuts.has(shortcut)) {
        globalShortcut.unregister(shortcut);
        this.registeredShortcuts.delete(shortcut);
        console.log(`✅ Unregistered shortcut: ${shortcut}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error unregistering shortcut ${shortcut}:`, error);
      return false;
    }
  }

  updateShortcut() {
    // Get shortcut from store
    const shortcut = this.store.get('shortcut', 'CommandOrControl+Shift+T');

    // Unregister all existing shortcuts
    this.unregisterAllShortcuts();

    // Register the single shortcut
    this.registerShortcut(shortcut, () => {
      console.log(`${shortcut} detected - auto-copying and analyzing text`);
      this.autoCopyAndAnalyze();
    });
  }

  unregisterAllShortcuts() {
    // Unregister all existing shortcuts
    for (const [shortcut, action] of this.registeredShortcuts) {
      this.unregisterShortcut(shortcut);
    }
  }
}

// App event handlers
const aiAssistant = new AIWritingAssistant();

app.whenReady().then(async () => {
  aiAssistant.createWindow();
  aiAssistant.createTray();
  
  // Initialize shortcut from store
  aiAssistant.updateShortcut();
  
  // Initialize AI services - using environment variables
  console.log('AI Reponder initialized with environment variables');
  console.log('Global shortcuts registered dynamically from preferences');
  
  // Show app in dock
  app.dock?.show();
});

app.on('window-all-closed', () => {
  // Keep app running in background
});

// Note: Global shortcuts are automatically cleaned up when the app quits

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    aiAssistant.createWindow();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (aiAssistant.mainWindow && !aiAssistant.mainWindow.isDestroyed()) {
      if (aiAssistant.mainWindow.isMinimized()) aiAssistant.mainWindow.restore();
      aiAssistant.mainWindow.focus();
    }
  });
}

// Export the class for testing
module.exports = AIWritingAssistant;
