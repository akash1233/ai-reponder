/**
 * Jest Setup File
 * Global test configuration and setup
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock process.env for tests
process.env.NODE_ENV = 'test';
process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';

// Mock timers for better test control
jest.useFakeTimers();

// Mock Electron modules
jest.mock('electron', () => {
  const mockApp = {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
    isReady: jest.fn(() => true),
    getName: jest.fn(() => 'ai-reponder'),
    getVersion: jest.fn(() => '1.0.0'),
    getPath: jest.fn((name) => `/mock/path/${name}`),
    requestSingleInstanceLock: jest.fn(() => true),
    setAppUserModelId: jest.fn()
  };

  const mockBrowserWindow = jest.fn(() => ({
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
  }));

  const mockTray = jest.fn(() => ({
    setContextMenu: jest.fn(),
    setToolTip: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn()
  }));

  const mockMenu = {
    buildFromTemplate: jest.fn(() => ({
      popup: jest.fn()
    }))
  };

  const mockGlobalShortcut = {
    register: jest.fn(() => true),
    unregister: jest.fn(),
    unregisterAll: jest.fn(),
    isRegistered: jest.fn(() => false)
  };

  const mockClipboard = {
    readText: jest.fn(() => ''),
    writeText: jest.fn(() => Promise.resolve())
  };

  const mockScreen = {
    getCursorScreenPoint: jest.fn(() => ({ x: 100, y: 100 })),
    getDisplayNearestPoint: jest.fn(() => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 }
    })),
    getAllDisplays: jest.fn(() => [{
      bounds: { x: 0, y: 0, width: 1920, height: 1080 }
    }])
  };

  const mockIpcMain = {
    on: jest.fn(),
    handle: jest.fn(),
    removeHandler: jest.fn(),
    removeAllListeners: jest.fn()
  };

  const mockIpcRenderer = {
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    invoke: jest.fn()
  };

  const mockDialog = {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 }))
  };

        const mockShell = {
          openExternal: jest.fn()
        };

        const mockNativeImage = {
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
        };

        return {
          app: mockApp,
          BrowserWindow: mockBrowserWindow,
          Tray: mockTray,
          Menu: mockMenu,
          globalShortcut: mockGlobalShortcut,
          clipboard: mockClipboard,
          screen: mockScreen,
          ipcMain: mockIpcMain,
          ipcRenderer: mockIpcRenderer,
          dialog: mockDialog,
          shell: mockShell,
          nativeImage: mockNativeImage
        };
});

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key, defaultValue) => {
      const mockData = {
        'shortcuts.analyzeText': 'Cmd+Shift+C',
        'shortcuts.analyzeSlack': 'Cmd+Shift+T',
        'shortcuts.analyzeSpace': 'Cmd+Shift+Space',
        'shortcuts.analyzeAll': 'Cmd+Shift+A',
        'prompts.activePrompt': 'professional',
        'prompts.templates': {
          professional: 'Rewrite the message professionally, slick and without any ambiguity, keep it crisp and clean.',
          casual: 'Rewrite in a more casual, friendly tone',
          creative: 'Rewrite with more creativity and flair',
          technical: 'Rewrite with technical precision and clarity',
          custom: 'Custom prompt template'
        },
        'settings.darkMode': false,
        'settings.autoStart': true
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

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({
    data: {
      choices: [{
        message: {
          content: 'This is a professionally rewritten version of the text.'
        }
      }]
    }
  }))
}));

// Global test utilities
global.testUtils = {
  createMockWindow: () => ({
    loadFile: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    close: jest.fn(),
    hide: jest.fn(),
    isDestroyed: jest.fn(() => false),
    webContents: {
      send: jest.fn(),
      once: jest.fn(),
      on: jest.fn()
    },
    setPosition: jest.fn(),
    setSize: jest.fn()
  }),

  createMockSuggestions: (originalText = 'test text', suggestion = 'improved text') => ({
    originalText,
    grammarIssues: [],
    improvements: [],
    toneSuggestions: [],
    overallSuggestion: suggestion,
    confidence: 0.8
  }),

  createMockStore: (data = {}) => ({
    get: jest.fn((key, defaultValue) => data[key] || defaultValue),
    set: jest.fn()
  }),

  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});
