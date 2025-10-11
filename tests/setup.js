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
});
