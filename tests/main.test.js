/**
 * Tests for Main Electron Process
 * Tests the core functionality of the AI Writing Assistant main process
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(),
    on: jest.fn(),
    requestSingleInstanceLock: jest.fn(() => true),
    dock: { show: jest.fn() }
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  Menu: {
    buildFromTemplate: jest.fn()
  },
  Tray: jest.fn(),
  nativeImage: {
    createFromPath: jest.fn()
  },
  clipboard: {
    readText: jest.fn(),
    writeText: jest.fn()
  },
  globalShortcut: {
    register: jest.fn(() => true),
    unregister: jest.fn(),
    unregisterAll: jest.fn()
  }
}));

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn()
  }));
});

// Mock services
jest.mock('../src/services/TextMonitor');
jest.mock('../src/services/AIService');
jest.mock('../src/services/SlackIntegration');
jest.mock('../src/services/SuggestionOverlay');

describe('AI Writing Assistant Main Process', () => {
  let aiAssistant;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import the main module after mocks are set up
    delete require.cache[require.resolve('../src/main.js')];
  });

  describe('Application Initialization', () => {
    test('should initialize with required services', () => {
      const AIWritingAssistant = require('../src/main.js');
      expect(AIWritingAssistant).toBeDefined();
    });

    test('should create main window with correct properties', () => {
      const mockWindow = {
        loadFile: jest.fn(),
        on: jest.fn(),
        webContents: { send: jest.fn() },
        show: jest.fn(),
        focus: jest.fn(),
        isDestroyed: jest.fn(() => false)
      };
      BrowserWindow.mockImplementation(() => mockWindow);

      const AIWritingAssistant = require('../src/main.js');
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 400,
          height: 600,
          minWidth: 300,
          minHeight: 400,
          show: false,
          frame: false,
          transparent: true
        })
      );
    });

    test('should create system tray', () => {
      const AIWritingAssistant = require('../src/main.js');
      expect(Tray).toHaveBeenCalled();
    });
  });

  describe('Global Shortcuts', () => {
    test('should register default shortcuts', () => {
      const AIWritingAssistant = require('../src/main.js');
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+T',
        expect.any(Function)
      );
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+Space',
        expect.any(Function)
      );
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+C',
        expect.any(Function)
      );
    });

    test('should handle shortcut cooldown', () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      
      // Mock Date.now to test cooldown
      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      // First call should work
      instance.autoCopyAndAnalyze();
      expect(instance.lastShortcutTime).toBe(1000);

      // Second call within cooldown should be ignored
      instance.autoCopyAndAnalyze();
      // Should not update lastShortcutTime

      // Third call after cooldown should work
      mockTime = 2500; // 1.5 seconds later
      instance.autoCopyAndAnalyze();
      expect(instance.lastShortcutTime).toBe(2500);

      Date.now = originalDateNow;
    });
  });

  describe('Text Input Handling', () => {
    test('should validate text for analysis', () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();

      // Valid text
      expect(instance.isValidTextForAnalysis('This is a valid text')).toBe(true);
      expect(instance.isValidTextForAnalysis('Hello world!')).toBe(true);

      // Invalid text
      expect(instance.isValidTextForAnalysis('Hi')).toBe(false); // Too short
      expect(instance.isValidTextForAnalysis('12345')).toBe(false); // No letters
      expect(instance.isValidTextForAnalysis('')).toBe(false); // Empty
      expect(instance.isValidTextForAnalysis('a'.repeat(2001))).toBe(false); // Too long
    });

    test('should prevent multiple simultaneous popups', () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      
      // Mock suggestionOverlay
      instance.suggestionOverlay = {
        isShowing: jest.fn(() => true),
        showSuggestions: jest.fn()
      };

      instance.handleTextInput('test text');
      
      // Should not call showSuggestions if already showing
      expect(instance.suggestionOverlay.showSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('IPC Handlers', () => {
    test('should register all required IPC handlers', () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      instance.setupIPC();

      expect(ipcMain.handle).toHaveBeenCalledWith('save-api-key', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('get-api-key', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('toggle-monitoring', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('get-monitoring-status', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('get-suggestions', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('replace-text', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('save-settings', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('get-settings', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('update-shortcut', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('get-shortcuts', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('save-prompts', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('get-prompts', expect.any(Function));
    });

    test('should prevent duplicate IPC handler registration', () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      
      instance.setupIPC();
      const firstCallCount = ipcMain.handle.mock.calls.length;
      
      instance.setupIPC();
      const secondCallCount = ipcMain.handle.mock.calls.length;
      
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('Dynamic Shortcut Management', () => {
    test('should register shortcuts dynamically', () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      
      const success = instance.registerShortcut('CommandOrControl+Shift+X', () => {});
      expect(success).toBe(true);
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+X',
        expect.any(Function)
      );
    });

    test('should unregister shortcuts', () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      
      instance.registeredShortcuts.set('CommandOrControl+Shift+X', () => {});
      const success = instance.unregisterShortcut('CommandOrControl+Shift+X');
      
      expect(success).toBe(true);
      expect(globalShortcut.unregister).toHaveBeenCalledWith('CommandOrControl+Shift+X');
      expect(instance.registeredShortcuts.has('CommandOrControl+Shift+X')).toBe(false);
    });

    test('should update all shortcuts from store', () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      
      // Mock store
      instance.store = {
        get: jest.fn(() => ({
          autoCopy: 'CommandOrControl+Shift+T',
          altAutoCopy: 'CommandOrControl+Shift+Space',
          analyzeClipboard: 'CommandOrControl+Shift+C'
        }))
      };

      instance.updateShortcuts();
      
      expect(globalShortcut.unregisterAll).toHaveBeenCalled();
      expect(globalShortcut.register).toHaveBeenCalledTimes(3);
    });
  });

  describe('AppleScript Integration', () => {
    test('should handle AppleScript execution', async () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      
      // Mock child_process.exec
      const mockExec = jest.fn((command, callback) => {
        callback(null, '', ''); // Success
      });
      jest.doMock('child_process', () => ({
        exec: mockExec
      }));

      // Mock clipboard
      const { clipboard } = require('electron');
      clipboard.readText.mockReturnValue('test text');

      await instance.autoCopyAndAnalyze();
      
      expect(mockExec).toHaveBeenCalled();
      expect(clipboard.readText).toHaveBeenCalled();
    });

    test('should handle AppleScript errors gracefully', async () => {
      const AIWritingAssistant = require('../src/main.js');
      const instance = new AIWritingAssistant();
      
      // Mock child_process.exec with error
      const mockExec = jest.fn((command, callback) => {
        callback(new Error('AppleScript failed'), '', '');
      });
      jest.doMock('child_process', () => ({
        exec: mockExec
      }));

      // Mock clipboard
      const { clipboard } = require('electron');
      clipboard.readText.mockReturnValue('fallback text');

      await instance.autoCopyAndAnalyze();
      
      expect(mockExec).toHaveBeenCalled();
      expect(clipboard.readText).toHaveBeenCalled();
    });
  });
});
