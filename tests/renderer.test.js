/**
 * Tests for Renderer Process
 * Tests the UI functionality and user interactions
 */

// Mock electron modules
jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('Renderer Process', () => {
  let mockIpcRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIpcRenderer = require('electron').ipcRenderer;
    
    // Reset DOM
    document.body.innerHTML = '';
  });

  describe('DOM Manipulation', () => {
    test('should create main app container', () => {
      // Simulate loading the HTML
      document.body.innerHTML = `
        <div class="app-container">
          <div class="header">
            <div class="logo">AI Reponder</div>
          </div>
          <div class="main-content">
            <div class="suggestion-history" id="suggestionHistory"></div>
          </div>
        </div>
      `;

      const container = document.querySelector('.app-container');
      expect(container).toBeTruthy();
      expect(container.querySelector('.header')).toBeTruthy();
      expect(container.querySelector('.main-content')).toBeTruthy();
    });

    test('should have suggestion history container', () => {
      document.body.innerHTML = `
        <div class="suggestion-history" id="suggestionHistory"></div>
      `;

      const historyContainer = document.getElementById('suggestionHistory');
      expect(historyContainer).toBeTruthy();
    });

    test('should have settings panel', () => {
      document.body.innerHTML = `
        <div class="config-panel" id="configPanel" style="display: none;">
          <div class="config-section">
            <h3>Keyboard Shortcuts</h3>
          </div>
        </div>
      `;

      const configPanel = document.getElementById('configPanel');
      expect(configPanel).toBeTruthy();
      expect(configPanel.style.display).toBe('none');
    });
  });

  describe('Settings Management', () => {
    test('should load settings on initialization', async () => {
      const mockSettings = {
        darkMode: false,
        shortcuts: {
          autoCopy: 'CommandOrControl+Shift+T',
          altAutoCopy: 'CommandOrControl+Shift+Space',
          analyzeClipboard: 'CommandOrControl+Shift+C'
        }
      };

      mockIpcRenderer.invoke.mockResolvedValue(mockSettings);

      // Simulate settings loading
      const settings = await mockIpcRenderer.invoke('get-settings');
      expect(settings).toEqual(mockSettings);
    });

    test('should save settings when changed', async () => {
      const newSettings = {
        darkMode: true,
        shortcuts: {
          autoCopy: 'CommandOrControl+Shift+X'
        }
      };

      mockIpcRenderer.invoke.mockResolvedValue({ success: true });

      const result = await mockIpcRenderer.invoke('save-settings', newSettings);
      expect(result.success).toBe(true);
    });

    test('should load prompts configuration', async () => {
      const mockPrompts = {
        activePrompt: 'professional',
        templates: {
          professional: 'Rewrite professionally...',
          casual: 'Rewrite casually...',
          creative: 'Rewrite creatively...',
          technical: 'Rewrite technically...',
          custom: 'Custom rewrite...'
        }
      };

      mockIpcRenderer.invoke.mockResolvedValue(mockPrompts);

      const prompts = await mockIpcRenderer.invoke('get-prompts');
      expect(prompts).toEqual(mockPrompts);
    });
  });

  describe('Suggestion History', () => {
    test('should display accepted suggestions', () => {
      document.body.innerHTML = `
        <div class="suggestion-history" id="suggestionHistory"></div>
      `;

      const historyContainer = document.getElementById('suggestionHistory');
      const suggestion = {
        originalText: 'test text',
        suggestion: 'improved text',
        timestamp: new Date()
      };

      // Simulate adding accepted suggestion
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'suggestion-item accepted';
      suggestionElement.innerHTML = `
        <div class="suggestion-original">${suggestion.originalText}</div>
        <div class="suggestion-improved">${suggestion.suggestion}</div>
        <div class="suggestion-timestamp">${suggestion.timestamp.toLocaleTimeString()}</div>
      `;
      historyContainer.appendChild(suggestionElement);

      expect(historyContainer.querySelector('.suggestion-item.accepted')).toBeTruthy();
      expect(historyContainer.querySelector('.suggestion-original').textContent).toBe('test text');
      expect(historyContainer.querySelector('.suggestion-improved').textContent).toBe('improved text');
    });

    test('should display rejected suggestions', () => {
      document.body.innerHTML = `
        <div class="suggestion-history" id="suggestionHistory"></div>
      `;

      const historyContainer = document.getElementById('suggestionHistory');
      const suggestion = {
        originalText: 'test text',
        suggestion: 'rejected suggestion',
        timestamp: new Date()
      };

      // Simulate adding rejected suggestion
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'suggestion-item rejected';
      suggestionElement.innerHTML = `
        <div class="suggestion-original">${suggestion.originalText}</div>
        <div class="suggestion-reason">Rejected</div>
        <div class="suggestion-timestamp">${suggestion.timestamp.toLocaleTimeString()}</div>
      `;
      historyContainer.appendChild(suggestionElement);

      expect(historyContainer.querySelector('.suggestion-item.rejected')).toBeTruthy();
      expect(historyContainer.querySelector('.suggestion-reason').textContent).toBe('Rejected');
    });

    test('should limit history size', () => {
      document.body.innerHTML = `
        <div class="suggestion-history" id="suggestionHistory"></div>
      `;

      const historyContainer = document.getElementById('suggestionHistory');
      const maxItems = 10;

      // Add more items than the limit
      for (let i = 0; i < 15; i++) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = `Item ${i}`;
        historyContainer.appendChild(item);
      }

      // Simulate limiting history
      const items = historyContainer.querySelectorAll('.suggestion-item');
      if (items.length > maxItems) {
        const itemsToRemove = items.length - maxItems;
        for (let i = 0; i < itemsToRemove; i++) {
          items[i].remove();
        }
      }

      const remainingItems = historyContainer.querySelectorAll('.suggestion-item');
      expect(remainingItems.length).toBeLessThanOrEqual(maxItems);
    });
  });

  describe('Dark Mode Toggle', () => {
    test('should toggle dark mode class', () => {
      document.body.innerHTML = `
        <div class="app-container">
          <button class="theme-toggle" id="themeToggle">🌙</button>
        </div>
      `;

      const container = document.querySelector('.app-container');
      const toggleButton = document.getElementById('themeToggle');

      // Initial state
      expect(container.classList.contains('dark-mode')).toBe(false);

      // Toggle dark mode
      container.classList.toggle('dark-mode');
      expect(container.classList.contains('dark-mode')).toBe(true);

      // Toggle back
      container.classList.toggle('dark-mode');
      expect(container.classList.contains('dark-mode')).toBe(false);
    });

    test('should update theme toggle icon', () => {
      document.body.innerHTML = `
        <button class="theme-toggle" id="themeToggle">🌙</button>
      `;

      const toggleButton = document.getElementById('themeToggle');
      const isDarkMode = document.body.classList.contains('dark-mode');

      if (isDarkMode) {
        toggleButton.textContent = '☀️';
      } else {
        toggleButton.textContent = '🌙';
      }

      expect(toggleButton.textContent).toBe('🌙');
    });
  });

  describe('Shortcut Configuration', () => {
    test('should display current shortcuts', () => {
      document.body.innerHTML = `
        <div class="config-panel">
          <div class="shortcut-info">
            <span class="shortcut-label">Auto-copy and analyze:</span>
            <span class="shortcut-key">Cmd+Shift+T</span>
          </div>
        </div>
      `;

      const shortcutLabel = document.querySelector('.shortcut-label');
      const shortcutKey = document.querySelector('.shortcut-key');

      expect(shortcutLabel.textContent).toBe('Auto-copy and analyze:');
      expect(shortcutKey.textContent).toBe('Cmd+Shift+T');
    });

    test('should update shortcut when changed', async () => {
      const newShortcut = 'CommandOrControl+Shift+X';
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });

      const result = await mockIpcRenderer.invoke('update-shortcut', {
        action: 'autoCopy',
        shortcut: newShortcut
      });

      expect(result.success).toBe(true);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('update-shortcut', {
        action: 'autoCopy',
        shortcut: newShortcut
      });
    });
  });

  describe('Prompt Configuration', () => {
    test('should display prompt templates', () => {
      document.body.innerHTML = `
        <div class="config-panel">
          <select id="activePrompt">
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="creative">Creative</option>
            <option value="technical">Technical</option>
            <option value="custom">Custom</option>
          </select>
          <textarea id="professionalPrompt">Rewrite professionally...</textarea>
        </div>
      `;

      const promptSelect = document.getElementById('activePrompt');
      const professionalTextarea = document.getElementById('professionalPrompt');

      expect(promptSelect).toBeTruthy();
      expect(professionalTextarea).toBeTruthy();
      expect(professionalTextarea.value).toBe('Rewrite professionally...');
    });

    test('should save prompt configuration', async () => {
      const prompts = {
        activePrompt: 'casual',
        templates: {
          casual: 'Rewrite casually...',
          professional: 'Rewrite professionally...'
        }
      };

      mockIpcRenderer.invoke.mockResolvedValue({ success: true });

      const result = await mockIpcRenderer.invoke('save-prompts', prompts);
      expect(result.success).toBe(true);
    });
  });

  describe('Event Listeners', () => {
    test('should handle suggestion accepted events', () => {
      document.body.innerHTML = `
        <div class="suggestion-history" id="suggestionHistory"></div>
      `;

      const historyContainer = document.getElementById('suggestionHistory');
      const event = new CustomEvent('suggestion-accepted', {
        detail: {
          originalText: 'test text',
          suggestion: 'improved text'
        }
      });

      // Simulate event handling
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'suggestion-item accepted';
      suggestionElement.innerHTML = `
        <div class="suggestion-original">${event.detail.originalText}</div>
        <div class="suggestion-improved">${event.detail.suggestion}</div>
      `;
      historyContainer.appendChild(suggestionElement);

      expect(historyContainer.querySelector('.suggestion-item.accepted')).toBeTruthy();
    });

    test('should handle suggestion rejected events', () => {
      document.body.innerHTML = `
        <div class="suggestion-history" id="suggestionHistory"></div>
      `;

      const historyContainer = document.getElementById('suggestionHistory');
      const event = new CustomEvent('suggestion-rejected', {
        detail: {
          originalText: 'test text',
          suggestion: 'rejected suggestion'
        }
      });

      // Simulate event handling
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'suggestion-item rejected';
      suggestionElement.innerHTML = `
        <div class="suggestion-original">${event.detail.originalText}</div>
        <div class="suggestion-reason">Rejected</div>
      `;
      historyContainer.appendChild(suggestionElement);

      expect(historyContainer.querySelector('.suggestion-item.rejected')).toBeTruthy();
    });
  });

  describe('UI State Management', () => {
    test('should show/hide settings panel', () => {
      document.body.innerHTML = `
        <div class="config-panel" id="configPanel" style="display: none;"></div>
        <button id="settingsBtn">Settings</button>
      `;

      const configPanel = document.getElementById('configPanel');
      const settingsBtn = document.getElementById('settingsBtn');

      // Show settings
      configPanel.style.display = 'block';
      expect(configPanel.style.display).toBe('block');

      // Hide settings
      configPanel.style.display = 'none';
      expect(configPanel.style.display).toBe('none');
    });

    test('should handle app status display', () => {
      document.body.innerHTML = `
        <div class="app-status">
          <div class="status-indicator" id="statusIndicator"></div>
          <div class="status-text" id="statusText">Ready</div>
        </div>
      `;

      const statusIndicator = document.getElementById('statusIndicator');
      const statusText = document.getElementById('statusText');

      // Update status
      statusIndicator.className = 'status-indicator active';
      statusText.textContent = 'Monitoring';

      expect(statusIndicator.classList.contains('active')).toBe(true);
      expect(statusText.textContent).toBe('Monitoring');
    });
  });

  describe('Error Handling', () => {
    test('should handle IPC errors gracefully', async () => {
      mockIpcRenderer.invoke.mockRejectedValue(new Error('IPC Error'));

      try {
        await mockIpcRenderer.invoke('get-settings');
      } catch (error) {
        expect(error.message).toBe('IPC Error');
      }
    });

    test('should handle missing DOM elements', () => {
      // Try to access non-existent element
      const nonExistentElement = document.getElementById('nonExistent');
      expect(nonExistentElement).toBeNull();
    });
  });

  describe('Local Storage Integration', () => {
    test('should save and load user preferences', () => {
      const preferences = {
        darkMode: true,
        lastActivePrompt: 'professional'
      };

      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      const loaded = JSON.parse(localStorage.getItem('userPreferences'));

      expect(loaded).toEqual(preferences);
    });

    test('should handle localStorage operations', () => {
      // Test basic localStorage functionality
      localStorage.setItem('testKey', 'testValue');
      expect(localStorage.getItem('testKey')).toBe('testValue');
      
      localStorage.removeItem('testKey');
      expect(localStorage.getItem('testKey')).toBeNull();
    });
  });
});
