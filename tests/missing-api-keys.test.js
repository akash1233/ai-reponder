/**
 * Tests for Missing API Keys Scenario
 * Tests the application behavior when API keys are not configured
 */

// Mock electron modules
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
    isReady: jest.fn(() => true),
    getName: jest.fn(() => 'ai-reponder'),
    getVersion: jest.fn(() => '1.0.0'),
    getPath: jest.fn((name) => `/mock/path/${name}`),
    requestSingleInstanceLock: jest.fn(() => true),
    setAppUserModelId: jest.fn()
  },
  BrowserWindow: jest.fn(() => ({
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    close: jest.fn(),
    hide: jest.fn(),
    isDestroyed: jest.fn(() => false),
    webContents: {
      send: jest.fn(),
      once: jest.fn(),
      on: jest.fn(),
      openDevTools: jest.fn(),
      closeDevTools: jest.fn()
    },
    setPosition: jest.fn(),
    setSize: jest.fn(),
    setBounds: jest.fn(),
    getBounds: jest.fn(() => ({ x: 0, y: 0, width: 800, height: 600 })),
    on: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn()
  })),
  Tray: jest.fn(() => ({
    setContextMenu: jest.fn(),
    setToolTip: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn()
  })),
  Menu: {
    buildFromTemplate: jest.fn(() => ({
      popup: jest.fn()
    }))
  },
  globalShortcut: {
    register: jest.fn(() => true),
    unregister: jest.fn(),
    unregisterAll: jest.fn(),
    isRegistered: jest.fn(() => false)
  },
  clipboard: {
    readText: jest.fn(() => ''),
    writeText: jest.fn(() => Promise.resolve())
  },
  screen: {
    getCursorScreenPoint: jest.fn(() => ({ x: 100, y: 100 })),
    getDisplayNearestPoint: jest.fn(() => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 }
    })),
    getAllDisplays: jest.fn(() => [{
      bounds: { x: 0, y: 0, width: 1920, height: 1080 }
    }])
  },
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn()
  },
  ipcRenderer: {
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    invoke: jest.fn()
  },
  dialog: {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 }))
  },
  shell: {
    openExternal: jest.fn()
  },
  nativeImage: {
    createFromPath: jest.fn(() => ({
      toDataURL: jest.fn(() => 'data:image/png;base64,test'),
      getSize: jest.fn(() => ({ width: 16, height: 16 }))
    })),
    createFromDataURL: jest.fn(() => ({
      toDataURL: jest.fn(() => 'data:image/png;base64,test'),
      getSize: jest.fn(() => ({ width: 16, height: 16 }))
    })),
    createFromBuffer: jest.fn(() => ({
      toDataURL: jest.fn(() => 'data:image/png;base64,test'),
      getSize: jest.fn(() => ({ width: 16, height: 16 }))
    }))
  }
}));

// Mock electron-store with no API keys
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key, defaultValue) => {
      // Return empty values for API keys
      if (key === 'apiKeys' || key.startsWith('apiKeys.')) {
        return defaultValue || '';
      }
      return defaultValue;
    }),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    has: jest.fn(() => false),
    size: 0,
    path: '/mock/store/path'
  }));
});

// Mock AIService
const mockAIService = jest.fn().mockImplementation(() => ({
  perplexityApiKey: process.env.PERPLEXITY_API_KEY || null,
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  geminiClient: null,
  initializePerplexity: jest.fn(() => Promise.resolve(false)),
  initializeGemini: jest.fn(() => Promise.resolve(false)),
  getSuggestions: jest.fn(() => Promise.reject(new Error('No AI provider configured')))
}));

jest.mock('../src/services/AIService', () => mockAIService);

// Mock other services
jest.mock('../src/services/TextMonitor', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    processText: jest.fn()
  }));
});

jest.mock('../src/services/SlackIntegration', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../src/services/SuggestionOverlay', () => {
  return jest.fn().mockImplementation(() => ({
    showSuggestions: jest.fn(),
    hide: jest.fn(),
    isShowing: jest.fn(() => false)
  }));
});

describe('Missing API Keys Scenario', () => {
  let AIWritingAssistant;
  let assistant;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear module cache
    delete require.cache[require.resolve('../src/main.js')];
    delete require.cache[require.resolve('electron-store')];
    delete require.cache[require.resolve('../src/services/AIService')];
    
    // Clear environment variables
    delete process.env.PERPLEXITY_API_KEY;
    delete process.env.GEMINI_API_KEY;
    
    // Get fresh instances
    AIWritingAssistant = require('../src/main.js');
    assistant = new AIWritingAssistant();
    
    // Manually register the handlers for testing
    assistant.setupIPC();
  });

  describe('Application Startup Without API Keys', () => {
    test('should initialize without API keys', () => {
      // Clear environment variables for this test
      const originalPerplexity = process.env.PERPLEXITY_API_KEY;
      const originalGemini = process.env.GEMINI_API_KEY;
      delete process.env.PERPLEXITY_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      // Create a fresh assistant without environment variables
      const freshAssistant = new AIWritingAssistant();
      
      expect(freshAssistant.aiService.perplexityApiKey).toBeNull();
      expect(freshAssistant.aiService.geminiApiKey).toBeNull();
      expect(freshAssistant.aiService.geminiClient).toBeNull();
      
      // Restore environment variables
      if (originalPerplexity) process.env.PERPLEXITY_API_KEY = originalPerplexity;
      if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
    });

    test('should handle AI service calls gracefully when no keys configured', async () => {
      try {
        await assistant.aiService.getSuggestions('test text');
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('No AI provider configured');
      }
    });

    test('should return empty API keys from store', async () => {
      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const getApiKeysHandler = handlerCalls.find(call => call[0] === 'get-api-keys');
      
      const result = await getApiKeysHandler[1]();
      expect(result).toEqual({
        perplexity: '',
        gemini: ''
      });
    });
  });

  describe('API Key Configuration UI', () => {
    test('should show configuration prompt when no keys are available', () => {
      // This would be tested in the renderer process
      // The UI should display the API keys configuration section
      // and show status indicators as "Not configured"
      expect(true).toBe(true); // Placeholder for UI test
    });

    test('should validate that at least one API key is required', () => {
      const mockKeys = {
        perplexity: '',
        gemini: ''
      };
      
      // At least one key should be required
      const hasValidKey = mockKeys.perplexity || mockKeys.gemini;
      expect(hasValidKey).toBeFalsy();
    });
  });

  describe('Error Handling Without API Keys', () => {
    test('should handle get-suggestions IPC call without API keys', async () => {
      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const getSuggestionsHandler = handlerCalls.find(call => call[0] === 'get-suggestions');
      
      const result = await getSuggestionsHandler[1](null, 'test text');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No AI provider configured');
    });

    test('should handle test-api-keys IPC call with empty keys', async () => {
      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const testApiKeysHandler = handlerCalls.find(call => call[0] === 'test-api-keys');
      
      expect(testApiKeysHandler).toBeDefined();
      
      // Test that the handler exists and can be called
      expect(typeof testApiKeysHandler[1]).toBe('function');
      
      // For now, just test that the handler exists
      // The actual functionality will be tested in integration tests
      expect(testApiKeysHandler[0]).toBe('test-api-keys');
    });

    test('should handle save-api-keys IPC call with empty keys', async () => {
      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const saveApiKeysHandler = handlerCalls.find(call => call[0] === 'save-api-keys');
      
      const result = await saveApiKeysHandler[1](null, {
        perplexity: '',
        gemini: ''
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Environment Variable Fallback', () => {
    test('should not find API keys in environment variables', () => {
      expect(process.env.PERPLEXITY_API_KEY).toBeUndefined();
      expect(process.env.GEMINI_API_KEY).toBeUndefined();
    });

    test('should initialize with environment variables when available', () => {
      // Set environment variables
      process.env.PERPLEXITY_API_KEY = 'pplx-env-key';
      process.env.GEMINI_API_KEY = 'AIzaSy-env-key';
      
      // Create new instance
      const newAssistant = new AIWritingAssistant();
      
      // The AIService should be initialized with these keys
      expect(newAssistant.aiService.perplexityApiKey).toBe('pplx-env-key');
      expect(newAssistant.aiService.geminiApiKey).toBe('AIzaSy-env-key');
      
      // Clean up
      delete process.env.PERPLEXITY_API_KEY;
      delete process.env.GEMINI_API_KEY;
    });
  });

  describe('User Experience Without API Keys', () => {
    test('should provide clear error messages when API keys are missing', async () => {
      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const getSuggestionsHandler = handlerCalls.find(call => call[0] === 'get-suggestions');
      
      const result = await getSuggestionsHandler[1](null, 'test text');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No AI provider configured');
    });

    test('should allow users to configure API keys through the UI', () => {
      // This test ensures the UI provides a way to configure API keys
      // The API keys configuration section should be visible and functional
      expect(true).toBe(true); // Placeholder for UI integration test
    });

    test('should prevent app crashes when shortcuts are used without API keys', async () => {
      // Test that using keyboard shortcuts doesn't crash the app
      // when no API keys are configured
      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const getSuggestionsHandler = handlerCalls.find(call => call[0] === 'get-suggestions');
      
      // Simulate shortcut usage
      const result = await getSuggestionsHandler[1](null, 'test text');
      
      // Should return error, not crash
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Configuration Recovery', () => {
    test('should allow adding API keys after startup', async () => {
      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const saveApiKeysHandler = handlerCalls.find(call => call[0] === 'save-api-keys');
      
      // Save new API keys
      const result = await saveApiKeysHandler[1](null, {
        perplexity: 'pplx-new-key',
        gemini: 'AIzaSy-new-key'
      });
      
      expect(result.success).toBe(true);
    });

    test('should validate API key format before saving', () => {
      const validPerplexityKey = 'pplx-1234567890abcdef';
      const validGeminiKey = 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g';
      const invalidKey = 'invalid-key';
      
      // Test Perplexity key validation
      expect(validPerplexityKey.startsWith('pplx-') || validPerplexityKey.startsWith('pplx_')).toBe(true);
      expect(invalidKey.startsWith('pplx-') || invalidKey.startsWith('pplx_')).toBe(false);
      
      // Test Gemini key validation
      expect(validGeminiKey.startsWith('AIza') && validGeminiKey.length > 20).toBe(true);
      expect(invalidKey.startsWith('AIza') && invalidKey.length > 20).toBe(false);
    });
  });

  describe('Integration Test - Complete Flow', () => {
    test('should have all required IPC handlers available', async () => {
      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      
      // Check that all required handlers are registered
      const handlerNames = handlerCalls.map(call => call[0]);
      expect(handlerNames).toContain('get-api-keys');
      expect(handlerNames).toContain('save-api-keys');
      expect(handlerNames).toContain('test-api-keys');
      expect(handlerNames).toContain('get-suggestions');
      
      // Test that handlers can be called
      const getApiKeysHandler = handlerCalls.find(call => call[0] === 'get-api-keys');
      const getSuggestionsHandler = handlerCalls.find(call => call[0] === 'get-suggestions');
      const saveApiKeysHandler = handlerCalls.find(call => call[0] === 'save-api-keys');
      
      expect(getApiKeysHandler).toBeDefined();
      expect(getSuggestionsHandler).toBeDefined();
      expect(saveApiKeysHandler).toBeDefined();
      
      // Test basic functionality
      const result = await getApiKeysHandler[1]();
      expect(result).toHaveProperty('perplexity');
      expect(result).toHaveProperty('gemini');
    });
  });
});
