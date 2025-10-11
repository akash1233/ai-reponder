// Load environment variables
require('dotenv').config();

const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const TextMonitor = require('./services/TextMonitor');
const AIService = require('./services/AIService');
const SlackIntegration = require('./services/SlackIntegration');

class AIWritingAssistant {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.store = new Store();
    this.textMonitor = new TextMonitor();
    this.aiService = new AIService();
    this.slackIntegration = new SlackIntegration();
    this.isMonitoring = false;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 400,
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
          this.mainWindow.show();
          this.mainWindow.focus();
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
      this.mainWindow.show();
      this.mainWindow.focus();
    });
  }

  setupIPC() {
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
  }

  async toggleMonitoring() {
    if (this.isMonitoring) {
      await this.textMonitor.stop();
      this.isMonitoring = false;
    } else {
      await this.textMonitor.start((text) => {
        this.handleTextInput(text);
      });
      this.isMonitoring = true;
    }
    
    // Update tray menu
    this.createTray();
    
    return this.isMonitoring;
  }

  async handleTextInput(text) {
    if (!text || text.length < 10) return;

    try {
      // Check if text is from Slack
      const isSlackText = await this.slackIntegration.isSlackText(text);
      
      // Get AI suggestions (auto-detect provider)
      const suggestions = await this.aiService.getSuggestions(text, {
        isSlack: isSlackText,
        context: 'slack', // or 'general'
        provider: 'auto' // Auto-detect which API key to use
      });

      // Send suggestions to renderer
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

  showSettings() {
    this.mainWindow.show();
    this.mainWindow.focus();
    this.mainWindow.webContents.send('show-settings');
  }
}

// App event handlers
const aiAssistant = new AIWritingAssistant();

app.whenReady().then(async () => {
  aiAssistant.createWindow();
  aiAssistant.createTray();
  
  // Initialize AI services - using hardcoded Perplexity key
  console.log('Perplexity API initialized (hardcoded)');
  console.log('Gemini API disabled - using Perplexity only');
  
  // Show app in dock
  app.dock?.show();
});

app.on('window-all-closed', () => {
  // Keep app running in background
});

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
    if (aiAssistant.mainWindow) {
      if (aiAssistant.mainWindow.isMinimized()) aiAssistant.mainWindow.restore();
      aiAssistant.mainWindow.focus();
    }
  });
}
