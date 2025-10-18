/**
 * Tests for API Keys Configuration
 * Tests the API keys UI and functionality
 */

const { ipcRenderer } = require('electron');

// Mock DOM elements and their methods
const mockElements = {};
const createElement = (tag, id, className, innerHTML = '') => {
  const statusIndicator = { className: 'status-indicator' };
  const statusText = { className: 'status-text', textContent: 'Not configured' };
  
  const element = {
    id,
    className,
    innerHTML,
    textContent: innerHTML,
    style: {},
    children: [],
    dataset: {},
    value: '',
    checked: false,
    type: 'text',
    disabled: false,
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false)
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    appendChild: jest.fn(child => element.children.push(child)),
    querySelector: jest.fn(selector => {
      if (selector === '.status-indicator') return statusIndicator;
      if (selector === '.status-text') return statusText;
      if (selector === '.eye-icon') return { style: { display: 'block' } };
      if (selector === '.eye-off-icon') return { style: { display: 'none' } };
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    focus: jest.fn(),
    closest: jest.fn(() => element)
  };
  mockElements[id] = element;
  return element;
};

// Mock document.getElementById
document.getElementById = jest.fn(id => {
  const element = mockElements[id] || createElement('div', id);
  // Ensure all elements have dispatchEvent
  if (!element.dispatchEvent) {
    element.dispatchEvent = jest.fn();
  }
  return element;
});
document.querySelector = jest.fn(selector => {
  if (selector === 'body') return { classList: { add: jest.fn(), remove: jest.fn() } };
  if (selector === '.toggle-visibility-btn[data-target="perplexityApiKey"]') {
    return {
      dataset: { target: 'perplexityApiKey' },
      querySelector: jest.fn(sel => {
        if (sel === '.eye-icon') return { style: { display: 'block' } };
        if (sel === '.eye-off-icon') return { style: { display: 'none' } };
        return null;
      }),
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      closest: jest.fn(() => ({
        dataset: { target: 'perplexityApiKey' },
        querySelector: jest.fn(sel => {
          if (sel === '.eye-icon') return { style: { display: 'block' } };
          if (sel === '.eye-off-icon') return { style: { display: 'none' } };
          return null;
        })
      }))
    };
  }
  return null;
});
document.querySelectorAll = jest.fn(() => []);

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    clear: jest.fn(() => { store = {}; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    length: jest.fn(() => Object.keys(store).length),
    key: jest.fn(i => Object.keys(store)[i])
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock ipcRenderer
jest.mock('electron', () => ({
  ipcRenderer: {
    send: jest.fn(),
    on: jest.fn(),
    invoke: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn()
  }
}));

// Mock alert
global.alert = jest.fn();

describe('API Keys Configuration', () => {
  let renderer;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset DOM
    document.body.innerHTML = `
      <div id="app">
        <input id="perplexityApiKey" type="password" value="">
        <input id="geminiApiKey" type="password" value="">
        <button id="testKeysBtn">Test API Keys</button>
        <button id="saveKeysBtn">Save API Keys</button>
        <div id="perplexityStatus">
          <span class="status-indicator"></span>
          <span class="status-text">Not configured</span>
        </div>
        <div id="geminiStatus">
          <span class="status-indicator"></span>
          <span class="status-text">Not configured</span>
        </div>
        <button class="toggle-visibility-btn" data-target="perplexityApiKey">
          <svg class="eye-icon" style="display: block;"></svg>
          <svg class="eye-off-icon" style="display: none;"></svg>
        </button>
        <button class="toggle-visibility-btn" data-target="geminiApiKey">
          <svg class="eye-icon" style="display: block;"></svg>
          <svg class="eye-off-icon" style="display: none;"></svg>
        </button>
      </div>
    `;
    
    // Update mock elements with proper querySelector
    Object.keys(mockElements).forEach(key => {
      const element = mockElements[key];
      element.querySelector = jest.fn(selector => {
        if (selector === '.status-indicator') return { className: 'status-indicator' };
        if (selector === '.status-text') return { className: 'status-text', textContent: 'Not configured' };
        if (selector === '.eye-icon') return { style: { display: 'block' } };
        if (selector === '.eye-off-icon') return { style: { display: 'none' } };
        return null;
      });
    });
    
    // Re-initialize elements after DOM reset
    Object.keys(mockElements).forEach(key => delete mockElements[key]);
  });

  describe('API Key Validation', () => {
    test('should validate Perplexity API key format', () => {
      // Import the renderer module to access validation functions
      const rendererModule = require('../src/renderer/renderer');
      
      const perplexityInput = document.getElementById('perplexityApiKey');
      const geminiInput = document.getElementById('geminiApiKey');
      
      // Test valid Perplexity key
      perplexityInput.value = 'pplx-1234567890abcdef';
      rendererModule.validateApiKey(perplexityInput);
      
      const statusEl = document.getElementById('perplexityStatus');
      const indicator = statusEl.querySelector('.status-indicator');
      const text = statusEl.querySelector('.status-text');
      
      expect(indicator.className).toContain('valid');
      expect(text.className).toContain('valid');
      expect(text.textContent).toBe('Valid format');
    });

    test('should validate Gemini API key format', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      const geminiInput = document.getElementById('geminiApiKey');
      
      // Test valid Gemini key
      geminiInput.value = 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g';
      rendererModule.validateApiKey(geminiInput);
      
      const statusEl = document.getElementById('geminiStatus');
      const indicator = statusEl.querySelector('.status-indicator');
      const text = statusEl.querySelector('.status-text');
      
      expect(indicator.className).toContain('valid');
      expect(text.className).toContain('valid');
      expect(text.textContent).toBe('Valid format');
    });

    test('should reject invalid API key formats', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      const perplexityInput = document.getElementById('perplexityApiKey');
      const geminiInput = document.getElementById('geminiApiKey');
      
      // Test invalid Perplexity key
      perplexityInput.value = 'invalid-key';
      rendererModule.validateApiKey(perplexityInput);
      
      const perplexityStatus = document.getElementById('perplexityStatus');
      const perplexityIndicator = perplexityStatus.querySelector('.status-indicator');
      const perplexityText = perplexityStatus.querySelector('.status-text');
      
      expect(perplexityIndicator.className).toContain('invalid');
      expect(perplexityText.className).toContain('invalid');
      expect(perplexityText.textContent).toBe('Invalid format');
      
      // Test invalid Gemini key
      geminiInput.value = 'invalid-key';
      rendererModule.validateApiKey(geminiInput);
      
      const geminiStatus = document.getElementById('geminiStatus');
      const geminiIndicator = geminiStatus.querySelector('.status-indicator');
      const geminiText = geminiStatus.querySelector('.status-text');
      
      expect(geminiIndicator.className).toContain('invalid');
      expect(geminiText.className).toContain('invalid');
      expect(geminiText.textContent).toBe('Invalid format');
    });

    test('should handle empty API keys', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      const perplexityInput = document.getElementById('perplexityApiKey');
      
      // Test empty key
      perplexityInput.value = '';
      rendererModule.validateApiKey(perplexityInput);
      
      const statusEl = document.getElementById('perplexityStatus');
      const indicator = statusEl.querySelector('.status-indicator');
      const text = statusEl.querySelector('.status-text');
      
      expect(indicator.className).toBe('status-indicator');
      expect(text.className).toBe('status-text');
      expect(text.textContent).toBe('Not configured');
    });
  });

  describe('API Key Loading', () => {
    test('should load API keys from localStorage', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Mock localStorage data
      const mockKeys = {
        perplexity: 'pplx-1234567890abcdef',
        gemini: 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g'
      };
      localStorage.setItem('apiKeys', JSON.stringify(mockKeys));
      
      // Mock ipcRenderer.invoke to return empty keys
      ipcRenderer.invoke.mockResolvedValueOnce(null);
      
      rendererModule.loadApiKeys();
      
      expect(document.getElementById('perplexityApiKey').value).toBe('pplx-1234567890abcdef');
      expect(document.getElementById('geminiApiKey').value).toBe('AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g');
    });

    test('should load API keys from main process', async () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Mock ipcRenderer.invoke to return keys
      const mockKeys = {
        perplexity: 'pplx-1234567890abcdef',
        gemini: 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g'
      };
      ipcRenderer.invoke.mockResolvedValueOnce(mockKeys);
      
      await rendererModule.loadApiKeys();
      
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-api-keys');
      expect(document.getElementById('perplexityApiKey').value).toBe('pplx-1234567890abcdef');
      expect(document.getElementById('geminiApiKey').value).toBe('AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g');
    });

    test('should handle localStorage parsing errors', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Mock invalid JSON in localStorage
      localStorage.setItem('apiKeys', 'invalid-json');
      
      // Mock console.error to track error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      rendererModule.loadApiKeys();
      
      expect(consoleSpy).toHaveBeenCalledWith('Error loading API keys:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('API Key Saving', () => {
    test('should save API keys to localStorage and main process', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Set up input values
      document.getElementById('perplexityApiKey').value = 'pplx-1234567890abcdef';
      document.getElementById('geminiApiKey').value = 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g';
      
      rendererModule.saveApiKeys();
      
      // Check localStorage
      const savedKeys = JSON.parse(localStorage.getItem('apiKeys'));
      expect(savedKeys.perplexity).toBe('pplx-1234567890abcdef');
      expect(savedKeys.gemini).toBe('AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g');
      
      // Check IPC call
      expect(ipcRenderer.send).toHaveBeenCalledWith('save-api-keys', {
        perplexity: 'pplx-1234567890abcdef',
        gemini: 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g'
      });
    });

    test('should show alert when no API keys provided', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Set up empty input values
      document.getElementById('perplexityApiKey').value = '';
      document.getElementById('geminiApiKey').value = '';
      
      rendererModule.saveApiKeys();
      
      expect(global.alert).toHaveBeenCalledWith('Please enter at least one API key.');
      expect(ipcRenderer.send).not.toHaveBeenCalled();
    });

    test('should show success feedback after saving', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Set up input values
      document.getElementById('perplexityApiKey').value = 'pplx-1234567890abcdef';
      document.getElementById('geminiApiKey').value = '';
      
      rendererModule.saveApiKeys();
      
      // Check that save button shows success state
      const saveBtn = document.getElementById('saveKeysBtn');
      expect(saveBtn.innerHTML).toContain('Saved!');
      expect(saveBtn.style.background).toBe('var(--accent-success)');
    });
  });

  describe('API Key Testing', () => {
    test('should test API keys and update status', async () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Set up input values
      document.getElementById('perplexityApiKey').value = 'pplx-1234567890abcdef';
      document.getElementById('geminiApiKey').value = 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g';
      
      // Mock successful test result
      const mockTestResult = {
        success: true,
        perplexity: { success: true, message: 'Perplexity API key is working' },
        gemini: { success: true, message: 'Gemini API key is working' }
      };
      ipcRenderer.invoke.mockResolvedValueOnce(mockTestResult);
      
      await rendererModule.testApiKeys();
      
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('test-api-keys', {
        perplexity: 'pplx-1234567890abcdef',
        gemini: 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g'
      });
      
      expect(global.alert).toHaveBeenCalledWith('API keys tested successfully!');
    });

    test('should handle API key test failures', async () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Set up input values
      document.getElementById('perplexityApiKey').value = 'pplx-1234567890abcdef';
      document.getElementById('geminiApiKey').value = '';
      
      // Mock failed test result
      const mockTestResult = {
        success: false,
        error: 'Invalid API key',
        perplexity: { success: false, error: 'Invalid API key' },
        gemini: null
      };
      ipcRenderer.invoke.mockResolvedValueOnce(mockTestResult);
      
      await rendererModule.testApiKeys();
      
      expect(global.alert).toHaveBeenCalledWith('API key test failed: Invalid API key');
    });

    test('should show alert when no keys provided for testing', async () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Set up empty input values
      document.getElementById('perplexityApiKey').value = '';
      document.getElementById('geminiApiKey').value = '';
      
      await rendererModule.testApiKeys();
      
      expect(global.alert).toHaveBeenCalledWith('Please enter at least one API key to test.');
      expect(ipcRenderer.invoke).not.toHaveBeenCalled();
    });

    test('should handle test errors gracefully', async () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Set up input values
      document.getElementById('perplexityApiKey').value = 'pplx-1234567890abcdef';
      document.getElementById('geminiApiKey').value = '';
      
      // Mock IPC error
      ipcRenderer.invoke.mockRejectedValueOnce(new Error('Network error'));
      
      await rendererModule.testApiKeys();
      
      expect(global.alert).toHaveBeenCalledWith('Error testing API keys: Network error');
    });
  });

  describe('Visibility Toggle', () => {
    test('should toggle password visibility', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      const toggleBtn = document.querySelector('.toggle-visibility-btn[data-target="perplexityApiKey"]');
      const input = document.getElementById('perplexityApiKey');
      const eyeIcon = toggleBtn.querySelector('.eye-icon');
      const eyeOffIcon = toggleBtn.querySelector('.eye-off-icon');
      
      // Initially password type
      input.type = 'password';
      eyeIcon.style.display = 'block';
      eyeOffIcon.style.display = 'none';
      
      // Mock the toggle functionality
      toggleBtn.dispatchEvent.mockImplementation(() => {
        if (input.type === 'password') {
          input.type = 'text';
          eyeIcon.style.display = 'none';
          eyeOffIcon.style.display = 'block';
        } else {
          input.type = 'password';
          eyeIcon.style.display = 'block';
          eyeOffIcon.style.display = 'none';
        }
      });
      
      // Simulate click
      const clickEvent = { type: 'click', target: toggleBtn };
      toggleBtn.dispatchEvent(clickEvent);
      
      // Should toggle to text type
      expect(input.type).toBe('text');
      expect(eyeIcon.style.display).toBe('none');
      expect(eyeOffIcon.style.display).toBe('block');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Mock missing elements
      document.getElementById.mockReturnValueOnce(null);
      
      expect(() => {
        rendererModule.loadApiKeys();
      }).not.toThrow();
    });

    test('should handle IPC errors gracefully', async () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // Mock localStorage to return null so it tries IPC
      const originalLocalStorage = global.localStorage;
      global.localStorage = {
        getItem: jest.fn(() => null),
        setItem: jest.fn()
      };
      
      // Mock DOM elements that loadApiKeys tries to access
      const mockPerplexityInput = { value: '', id: 'perplexityApiKey' };
      const mockGeminiInput = { value: '', id: 'geminiApiKey' };
      document.getElementById.mockImplementation(id => {
        if (id === 'perplexityApiKey') return mockPerplexityInput;
        if (id === 'geminiApiKey') return mockGeminiInput;
        return null;
      });
      
      // Mock IPC error
      ipcRenderer.invoke.mockRejectedValueOnce(new Error('IPC error'));
      
      // Mock console.error to track error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      rendererModule.loadApiKeys();
      
      // Wait for the promise to resolve/reject
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleSpy).toHaveBeenCalledWith('Error getting API keys from main process:', expect.any(Error));
      
      consoleSpy.mockRestore();
      global.localStorage = originalLocalStorage;
    });
  });

  describe('Integration Tests', () => {
    test('should complete full API key configuration flow', async () => {
      const rendererModule = require('../src/renderer/renderer');
      
      // 1. Load empty keys
      ipcRenderer.invoke.mockResolvedValueOnce({ perplexity: '', gemini: '' });
      await rendererModule.loadApiKeys();
      
      // 2. Enter valid keys
      const perplexityInput = document.getElementById('perplexityApiKey');
      const geminiInput = document.getElementById('geminiApiKey');
      perplexityInput.value = 'pplx-1234567890abcdef';
      geminiInput.value = 'AIzaSyAI7a_bFh8C3fWwImD67u_pDLhrBnI379g';
      
      // Ensure status elements exist with proper querySelector
      const perplexityStatus = createElement('div', 'perplexityStatus');
      const geminiStatus = createElement('div', 'geminiStatus');
      const testBtn = createElement('button', 'testKeysBtn');
      const saveBtn = createElement('button', 'saveKeysBtn');
      document.getElementById.mockImplementation(id => {
        if (id === 'perplexityApiKey') return perplexityInput;
        if (id === 'geminiApiKey') return geminiInput;
        if (id === 'perplexityStatus') return perplexityStatus;
        if (id === 'geminiStatus') return geminiStatus;
        if (id === 'testKeysBtn') return testBtn;
        if (id === 'saveKeysBtn') return saveBtn;
        return null;
      });
      
      // 3. Validate keys
      rendererModule.validateApiKey(perplexityInput);
      rendererModule.validateApiKey(geminiInput);
      
      // 4. Test keys
      const mockTestResult = {
        success: true,
        perplexity: { success: true },
        gemini: { success: true }
      };
      ipcRenderer.invoke.mockResolvedValueOnce(mockTestResult);
      await rendererModule.testApiKeys();
      
      // 5. Save keys
      rendererModule.saveApiKeys();
      
      // Verify all steps completed
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('get-api-keys');
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('test-api-keys', expect.any(Object));
      expect(ipcRenderer.send).toHaveBeenCalledWith('save-api-keys', expect.any(Object));
      expect(localStorage.getItem('apiKeys')).toBeTruthy();
    });
  });
});
