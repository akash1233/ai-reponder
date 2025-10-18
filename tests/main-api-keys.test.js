/**
 * Tests for Main Process API Keys Functionality
 * Tests the IPC handlers and API key management in the main process
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
  }
}));

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key, defaultValue) => {
      const mockData = {
        'apiKeys.perplexity': 'pplx-test-key',
        'apiKeys.gemini': 'AIzaSy-test-key',
        'apiKeys': {
          perplexity: 'pplx-test-key',
          gemini: 'AIzaSy-test-key'
        }
      };
      return mockData[key] || defaultValue;
    }),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    has: jest.fn(() => true),
    size: 0,
    path: '/mock/store/path'
  }));
});

// Mock AIService
jest.mock('../src/services/AIService', () => {
  return jest.fn().mockImplementation(() => ({
    initializePerplexity: jest.fn(() => Promise.resolve(true)),
    initializeGemini: jest.fn(() => Promise.resolve(true)),
    getSuggestions: jest.fn(() => Promise.resolve({
      overallSuggestion: 'Test suggestion',
      confidence: 0.8
    }))
  }));
});

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

describe('Main Process API Keys', () => {
  let AIWritingAssistant;
  let mockStore;
  let mockAIService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear module cache to get fresh instances
    delete require.cache[require.resolve('../src/main.js')];
    delete require.cache[require.resolve('electron-store')];
    delete require.cache[require.resolve('../src/services/AIService')];
    
    // Mock process.env
    process.env.PERPLEXITY_API_KEY = 'pplx-env-key';
    process.env.GEMINI_API_KEY = 'AIzaSy-env-key';
    
    // Get fresh instances
    AIWritingAssistant = require('../src/main.js');
    mockStore = require('electron-store');
    mockAIService = require('../src/services/AIService');
  });

  describe('API Keys IPC Handlers', () => {
    let assistant;

    beforeEach(() => {
      assistant = new AIWritingAssistant();
    });

    describe('get-api-keys handler', () => {
      test('should return API keys from store', async () => {
        const mockKeys = {
          perplexity: 'pplx-test-key',
          gemini: 'AIzaSy-test-key'
        };
        mockStore.mockImplementationOnce(() => ({
          get: jest.fn((key, defaultValue) => {
            if (key === 'apiKeys') return mockKeys;
            return defaultValue;
          }),
          set: jest.fn()
        }));

        // Create a new instance to get the fresh store
        const newAssistant = new AIWritingAssistant();
        
        // Mock the handler registration
        const { ipcMain } = require('electron');
        const handlerCalls = ipcMain.handle.mock.calls;
        const getApiKeysHandler = handlerCalls.find(call => call[0] === 'get-api-keys');
        
        expect(getApiKeysHandler).toBeDefined();
        
        // Test the handler function
        const result = await getApiKeysHandler[1]();
        expect(result).toEqual({
          perplexity: 'pplx-test-key',
          gemini: 'AIzaSy-test-key'
        });
      });

      test('should return empty strings when no keys stored', async () => {
        mockStore.mockImplementationOnce(() => ({
          get: jest.fn((key, defaultValue) => defaultValue),
          set: jest.fn()
        }));

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

    describe('save-api-keys handler', () => {
      test('should save API keys to store and initialize services', async () => {
        const mockKeys = {
          perplexity: 'pplx-new-key',
          gemini: 'AIzaSy-new-key'
        };

        const mockStoreInstance = {
          get: jest.fn(),
          set: jest.fn()
        };
        mockStore.mockImplementationOnce(() => mockStoreInstance);

        const { ipcMain } = require('electron');
        const handlerCalls = ipcMain.handle.mock.calls;
        const saveApiKeysHandler = handlerCalls.find(call => call[0] === 'save-api-keys');
        
        const result = await saveApiKeysHandler[1](null, mockKeys);
        
        expect(mockStoreInstance.set).toHaveBeenCalledWith('apiKeys', mockKeys);
        expect(result.success).toBe(true);
      });

      test('should handle save errors gracefully', async () => {
        const mockKeys = {
          perplexity: 'pplx-new-key',
          gemini: 'AIzaSy-new-key'
        };

        const mockStoreInstance = {
          get: jest.fn(),
          set: jest.fn(() => { throw new Error('Store error'); })
        };
        mockStore.mockImplementationOnce(() => mockStoreInstance);

        const { ipcMain } = require('electron');
        const handlerCalls = ipcMain.handle.mock.calls;
        const saveApiKeysHandler = handlerCalls.find(call => call[0] === 'save-api-keys');
        
        const result = await saveApiKeysHandler[1](null, mockKeys);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Store error');
      });
    });

    describe('test-api-keys handler', () => {
      test('should test Perplexity API key successfully', async () => {
        const mockKeys = {
          perplexity: 'pplx-test-key',
          gemini: ''
        };

        const mockAIServiceInstance = {
          initializePerplexity: jest.fn(() => Promise.resolve(true)),
          getSuggestions: jest.fn(() => Promise.resolve({
            overallSuggestion: 'Test suggestion',
            confidence: 0.8
          }))
        };
        mockAIService.mockImplementationOnce(() => mockAIServiceInstance);

        const { ipcMain } = require('electron');
        const handlerCalls = ipcMain.handle.mock.calls;
        const testApiKeysHandler = handlerCalls.find(call => call[0] === 'test-api-keys');
        
        const result = await testApiKeysHandler[1](null, mockKeys);
        
        expect(result.success).toBe(true);
        expect(result.perplexity.success).toBe(true);
        expect(result.perplexity.message).toBe('Perplexity API key is working');
        expect(mockAIServiceInstance.initializePerplexity).toHaveBeenCalledWith('pplx-test-key');
        expect(mockAIServiceInstance.getSuggestions).toHaveBeenCalledWith('test', { provider: 'perplexity' });
      });

      test('should test Gemini API key successfully', async () => {
        const mockKeys = {
          perplexity: '',
          gemini: 'AIzaSy-test-key'
        };

        const mockAIServiceInstance = {
          initializeGemini: jest.fn(() => Promise.resolve(true)),
          getSuggestions: jest.fn(() => Promise.resolve({
            overallSuggestion: 'Test suggestion',
            confidence: 0.8
          }))
        };
        mockAIService.mockImplementationOnce(() => mockAIServiceInstance);

        const { ipcMain } = require('electron');
        const handlerCalls = ipcMain.handle.mock.calls;
        const testApiKeysHandler = handlerCalls.find(call => call[0] === 'test-api-keys');
        
        const result = await testApiKeysHandler[1](null, mockKeys);
        
        expect(result.success).toBe(true);
        expect(result.gemini.success).toBe(true);
        expect(result.gemini.message).toBe('Gemini API key is working');
        expect(mockAIServiceInstance.initializeGemini).toHaveBeenCalledWith('AIzaSy-test-key');
        expect(mockAIServiceInstance.getSuggestions).toHaveBeenCalledWith('test', { provider: 'gemini' });
      });

      test('should handle API key test failures', async () => {
        const mockKeys = {
          perplexity: 'pplx-invalid-key',
          gemini: ''
        };

        const mockAIServiceInstance = {
          initializePerplexity: jest.fn(() => Promise.resolve(true)),
          getSuggestions: jest.fn(() => Promise.reject(new Error('Invalid API key')))
        };
        mockAIService.mockImplementationOnce(() => mockAIServiceInstance);

        const { ipcMain } = require('electron');
        const handlerCalls = ipcMain.handle.mock.calls;
        const testApiKeysHandler = handlerCalls.find(call => call[0] === 'test-api-keys');
        
        const result = await testApiKeysHandler[1](null, mockKeys);
        
        expect(result.success).toBe(false);
        expect(result.perplexity.success).toBe(false);
        expect(result.perplexity.error).toBe('Invalid API key');
      });

      test('should return success if at least one key works', async () => {
        const mockKeys = {
          perplexity: 'pplx-valid-key',
          gemini: 'AIzaSy-invalid-key'
        };

        const mockAIServiceInstance = {
          initializePerplexity: jest.fn(() => Promise.resolve(true)),
          initializeGemini: jest.fn(() => Promise.resolve(true)),
          getSuggestions: jest.fn((text, options) => {
            if (options.provider === 'perplexity') {
              return Promise.resolve({ overallSuggestion: 'Test', confidence: 0.8 });
            } else {
              return Promise.reject(new Error('Invalid Gemini key'));
            }
          })
        };
        mockAIService.mockImplementationOnce(() => mockAIServiceInstance);

        const { ipcMain } = require('electron');
        const handlerCalls = ipcMain.handle.mock.calls;
        const testApiKeysHandler = handlerCalls.find(call => call[0] === 'test-api-keys');
        
        const result = await testApiKeysHandler[1](null, mockKeys);
        
        expect(result.success).toBe(true);
        expect(result.perplexity.success).toBe(true);
        expect(result.gemini.success).toBe(false);
      });

      test('should handle test errors gracefully', async () => {
        const mockKeys = {
          perplexity: 'pplx-test-key',
          gemini: ''
        };

        const { ipcMain } = require('electron');
        const handlerCalls = ipcMain.handle.mock.calls;
        const testApiKeysHandler = handlerCalls.find(call => call[0] === 'test-api-keys');
        
        // Mock AIService constructor to throw error
        mockAIService.mockImplementationOnce(() => {
          throw new Error('Service initialization error');
        });
        
        const result = await testApiKeysHandler[1](null, mockKeys);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Service initialization error');
      });
    });
  });

  describe('API Key Validation', () => {
    test('should validate Perplexity API key format', () => {
      const validKeys = [
        'pplx-1234567890abcdef',
        'pplx_1234567890abcdef',
        'pplx-abcdef1234567890'
      ];
      
      const invalidKeys = [
        'invalid-key',
        'pplx',
        'pplx-',
        'pplx_',
        'pplx-invalid',
        'pplx_invalid'
      ];
      
      validKeys.forEach(key => {
        expect(key.startsWith('pplx-') || key.startsWith('pplx_')).toBe(true);
      });
      
      invalidKeys.forEach(key => {
        expect(key.startsWith('pplx-') || key.startsWith('pplx_')).toBe(false);
      });
    });

    test('should validate Gemini API key format', () => {
      const validKeys = [
        'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g',
        'AIzaSy1234567890abcdefghijklmnopqrstuvwxyz'
      ];
      
      const invalidKeys = [
        'invalid-key',
        'AIza',
        'AIzaSy',
        'AIzaSy123', // Too short
        'AIzaSy1234567890abcdefghijklmnopqrstuvwxyz1234567890' // Too long
      ];
      
      validKeys.forEach(key => {
        expect(key.startsWith('AIza') && key.length > 20).toBe(true);
      });
      
      invalidKeys.forEach(key => {
        expect(key.startsWith('AIza') && key.length > 20).toBe(false);
      });
    });
  });

  describe('Environment Variable Integration', () => {
    test('should use environment variables when available', () => {
      expect(process.env.PERPLEXITY_API_KEY).toBe('pplx-env-key');
      expect(process.env.GEMINI_API_KEY).toBe('AIzaSy-env-key');
    });

    test('should handle missing environment variables', () => {
      const originalPerplexity = process.env.PERPLEXITY_API_KEY;
      const originalGemini = process.env.GEMINI_API_KEY;
      
      delete process.env.PERPLEXITY_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      expect(process.env.PERPLEXITY_API_KEY).toBeUndefined();
      expect(process.env.GEMINI_API_KEY).toBeUndefined();
      
      // Restore
      process.env.PERPLEXITY_API_KEY = originalPerplexity;
      process.env.GEMINI_API_KEY = originalGemini;
    });
  });

  describe('Error Handling', () => {
    test('should handle store errors gracefully', async () => {
      const mockStoreInstance = {
        get: jest.fn(() => { throw new Error('Store read error'); }),
        set: jest.fn()
      };
      mockStore.mockImplementationOnce(() => mockStoreInstance);

      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const getApiKeysHandler = handlerCalls.find(call => call[0] === 'get-api-keys');
      
      // Should not throw, but return default values
      const result = await getApiKeysHandler[1]();
      expect(result).toEqual({
        perplexity: '',
        gemini: ''
      });
    });

    test('should handle AIService initialization errors', async () => {
      const mockKeys = {
        perplexity: 'pplx-test-key',
        gemini: ''
      };

      const mockAIServiceInstance = {
        initializePerplexity: jest.fn(() => Promise.reject(new Error('Initialization failed'))),
        getSuggestions: jest.fn()
      };
      mockAIService.mockImplementationOnce(() => mockAIServiceInstance);

      const { ipcMain } = require('electron');
      const handlerCalls = ipcMain.handle.mock.calls;
      const testApiKeysHandler = handlerCalls.find(call => call[0] === 'test-api-keys');
      
      const result = await testApiKeysHandler[1](null, mockKeys);
      
      expect(result.success).toBe(false);
      expect(result.perplexity.success).toBe(false);
      expect(result.perplexity.error).toBe('Initialization failed');
    });
  });
});
