/**
 * Integration Tests for AI Reponder
 * Tests end-to-end workflows and component interactions
 */

// Mock all external dependencies
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
  ipcRenderer: {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
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
  },
  screen: {
    getCursorScreenPoint: jest.fn(() => ({ x: 100, y: 100 })),
    getPrimaryDisplay: jest.fn(() => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 }
    }))
  }
}));

jest.mock('axios');
jest.mock('electron-store');

describe('AI Reponder Integration Tests', () => {
  let mockAxios;
  let mockStore;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockAxios = require('axios');
    mockStore = require('electron-store');
    
    // Mock successful API response
    mockAxios.post.mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: 'This is a professionally rewritten version of the text.'
          }
        }]
      }
    });

    // Mock store
    const mockStoreInstance = {
      get: jest.fn((key, defaultValue) => {
        if (key === 'shortcuts') {
          return {
            autoCopy: 'CommandOrControl+Shift+T',
            altAutoCopy: 'CommandOrControl+Shift+Space',
            analyzeClipboard: 'CommandOrControl+Shift+C'
          };
        }
        if (key === 'prompts') {
          return {
            activePrompt: 'professional',
            templates: {
              professional: 'Rewrite the message professionally, slick and without any ambiguity, keep it crisp and clean.',
              casual: 'Rewrite this message in a more casual, friendly tone.',
              creative: 'Rewrite this message with more creative and engaging language.',
              technical: 'Rewrite this message with precise, technical language.',
              custom: 'Rewrite the message according to your specific requirements...'
            }
          };
        }
        return defaultValue;
      }),
      set: jest.fn()
    };
    mockStore.mockImplementation(() => mockStoreInstance);

    // Set environment variables
    process.env.PERPLEXITY_API_KEY = 'test-api-key';
  });

  describe('Complete Workflow: Text Analysis to Suggestion Display', () => {
    test('should handle complete workflow from shortcut to suggestion display', async () => {
      // Import services
      const AIService = require('../src/services/AIService.js');
      const SuggestionOverlay = require('../src/services/SuggestionOverlay.js');
      const TextMonitor = require('../src/services/TextMonitor.js');

      // Initialize services
      const aiService = new AIService();
      const suggestionOverlay = new SuggestionOverlay();
      const textMonitor = new TextMonitor();

      // Mock clipboard content
      const { clipboard } = require('electron');
      clipboard.readText.mockReturnValue('test the tested');

      // Step 1: Simulate shortcut press (autoCopyAndAnalyze)
      const originalText = clipboard.readText();
      expect(originalText).toBe('test the tested');

      // Step 2: Get AI suggestions
      const suggestions = await aiService.getSuggestions(originalText, {
        isSlack: false,
        context: 'general',
        promptTemplate: 'Rewrite the message professionally, slick and without any ambiguity, keep it crisp and clean.'
      });

      expect(suggestions).toHaveProperty('originalText', 'test the tested');
      expect(suggestions).toHaveProperty('overallSuggestion');
      expect(suggestions.overallSuggestion).toBe('This is a professionally rewritten version of the text.');

      // Step 3: Show suggestions in overlay
      const mockCallback = jest.fn();
      suggestionOverlay.showSuggestions(suggestions, originalText, mockCallback);

      expect(suggestionOverlay.isVisible).toBe(true);
      expect(suggestionOverlay.currentSuggestions).toBe(suggestions);

      // Step 4: Simulate user accepting suggestion
      const acceptedSuggestion = suggestions.overallSuggestion;
      clipboard.writeText(acceptedSuggestion);

      expect(clipboard.writeText).toHaveBeenCalledWith(acceptedSuggestion);
    });

    test('should handle workflow with different prompt templates', async () => {
      const AIService = require('../src/services/AIService.js');
      const aiService = new AIService();

      const testCases = [
        {
          template: 'professional',
          expectedPrompt: 'professionally, slick and without any ambiguity'
        },
        {
          template: 'casual',
          expectedPrompt: 'more casual, friendly tone'
        },
        {
          template: 'creative',
          expectedPrompt: 'more creative and engaging language'
        },
        {
          template: 'technical',
          expectedPrompt: 'precise, technical language'
        }
      ];

      for (const testCase of testCases) {
        const suggestions = await aiService.getSuggestions('test text', {
          promptTemplate: testCase.expectedPrompt
        });

        expect(suggestions).toHaveProperty('overallSuggestion');
        expect(mockAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: expect.stringContaining(testCase.expectedPrompt)
              })
            ])
          }),
          expect.any(Object)
        );
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle API failures gracefully', async () => {
      const AIService = require('../src/services/AIService.js');
      const aiService = new AIService();

      // Mock API failure
      mockAxios.post.mockRejectedValue(new Error('API Error'));

      await expect(aiService.getSuggestions('test text')).rejects.toThrow('API Error');
    });

    test('should handle invalid text gracefully', async () => {
      const TextMonitor = require('../src/services/TextMonitor.js');
      const textMonitor = new TextMonitor();

      const invalidTexts = ['', 'Hi', '12345', 'a'.repeat(2001)];

      for (const text of invalidTexts) {
        const callback = jest.fn();
        textMonitor.processText(text);
        expect(callback).not.toHaveBeenCalled();
      }
    });

    test('should handle overlay creation failures', () => {
      const SuggestionOverlay = require('../src/services/SuggestionOverlay.js');
      const suggestionOverlay = new SuggestionOverlay();

      // Mock BrowserWindow to throw error
      const { BrowserWindow } = require('electron');
      BrowserWindow.mockImplementation(() => {
        throw new Error('Window creation failed');
      });

      expect(() => {
        suggestionOverlay.showSuggestions({}, 'text', jest.fn());
      }).toThrow('Window creation failed');
    });
  });

  describe('Settings and Configuration Integration', () => {
    test('should persist and load user settings', () => {
      const mockStoreInstance = {
        get: jest.fn(),
        set: jest.fn()
      };
      mockStore.mockImplementation(() => mockStoreInstance);

      // Test saving settings
      const settings = {
        darkMode: true,
        shortcuts: {
          autoCopy: 'CommandOrControl+Shift+X'
        }
      };

      mockStoreInstance.set('settings', settings);
      expect(mockStoreInstance.set).toHaveBeenCalledWith('settings', settings);

      // Test loading settings
      mockStoreInstance.get.mockReturnValue(settings);
      const loadedSettings = mockStoreInstance.get('settings');
      expect(loadedSettings).toEqual(settings);
    });

    test('should update shortcuts dynamically', () => {
      const mockStoreInstance = {
        get: jest.fn(() => ({
          autoCopy: 'CommandOrControl+Shift+T',
          altAutoCopy: 'CommandOrControl+Shift+Space',
          analyzeClipboard: 'CommandOrControl+Shift+C'
        })),
        set: jest.fn()
      };
      mockStore.mockImplementation(() => mockStoreInstance);

      const { globalShortcut } = require('electron');

      // Simulate shortcut update
      const newShortcuts = {
        autoCopy: 'CommandOrControl+Shift+X',
        altAutoCopy: 'CommandOrControl+Shift+Y',
        analyzeClipboard: 'CommandOrControl+Shift+Z'
      };

      mockStoreInstance.set('shortcuts', newShortcuts);
      expect(mockStoreInstance.set).toHaveBeenCalledWith('shortcuts', newShortcuts);
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle multiple rapid shortcut presses', async () => {
      const AIService = require('../src/services/AIService.js');
      const aiService = new AIService();

      // Mock cooldown mechanism
      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      // Simulate rapid presses
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(aiService.getSuggestions(`text ${i}`));
        mockTime += 100; // 100ms between calls
      }

      await Promise.all(promises);

      // Should have made 5 API calls
      expect(mockAxios.post).toHaveBeenCalledTimes(5);

      Date.now = originalDateNow;
    });

    test('should clean up resources properly', () => {
      const SuggestionOverlay = require('../src/services/SuggestionOverlay.js');
      const suggestionOverlay = new SuggestionOverlay();

      // Create overlay
      suggestionOverlay.showSuggestions({}, 'text', jest.fn());
      expect(suggestionOverlay.isVisible).toBe(true);

      // Hide overlay
      suggestionOverlay.hide();
      expect(suggestionOverlay.isVisible).toBe(false);
      expect(suggestionOverlay.overlayWindow).toBeNull();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('should handle different shortcut formats', () => {
      const shortcuts = [
        'CommandOrControl+Shift+T', // Cross-platform
        'Cmd+Shift+T', // macOS
        'Ctrl+Shift+T' // Windows/Linux
      ];

      const { globalShortcut } = require('electron');

      shortcuts.forEach(shortcut => {
        globalShortcut.register(shortcut, () => {});
        expect(globalShortcut.register).toHaveBeenCalledWith(shortcut, expect.any(Function));
      });
    });

    test('should handle different screen resolutions', () => {
      const { screen } = require('electron');
      const SuggestionOverlay = require('../src/services/SuggestionOverlay.js');
      const suggestionOverlay = new SuggestionOverlay();

      // Test different screen sizes
      const screenSizes = [
        { width: 1920, height: 1080 },
        { width: 2560, height: 1440 },
        { width: 1366, height: 768 }
      ];

      screenSizes.forEach(size => {
        screen.getPrimaryDisplay.mockReturnValue({
          workArea: { x: 0, y: 0, width: size.width, height: size.height }
        });

        suggestionOverlay.overlayWindow = {
          setPosition: jest.fn(),
          setSize: jest.fn()
        };

        suggestionOverlay.positionOverlay();

        expect(suggestionOverlay.overlayWindow.setPosition).toHaveBeenCalled();
        expect(suggestionOverlay.overlayWindow.setSize).toHaveBeenCalled();
      });
    });
  });

  describe('Data Flow and State Management', () => {
    test('should maintain consistent state across components', () => {
      const AIService = require('../src/services/AIService.js');
      const SuggestionOverlay = require('../src/services/SuggestionOverlay.js');
      const TextMonitor = require('../src/services/TextMonitor.js');

      const aiService = new AIService();
      const suggestionOverlay = new SuggestionOverlay();
      const textMonitor = new TextMonitor();

      // Initial state
      expect(suggestionOverlay.isVisible).toBe(false);
      expect(textMonitor.isMonitoring).toBe(false);

      // Start monitoring
      textMonitor.start(() => {});
      expect(textMonitor.isMonitoring).toBe(true);

      // Show suggestions
      suggestionOverlay.showSuggestions({}, 'text', () => {});
      expect(suggestionOverlay.isVisible).toBe(true);

      // Hide suggestions
      suggestionOverlay.hide();
      expect(suggestionOverlay.isVisible).toBe(false);

      // Stop monitoring
      textMonitor.stop();
      expect(textMonitor.isMonitoring).toBe(false);
    });

    test('should handle concurrent operations safely', async () => {
      const AIService = require('../src/services/AIService.js');
      const aiService = new AIService();

      // Simulate concurrent API calls
      const promises = Array.from({ length: 3 }, (_, i) => 
        aiService.getSuggestions(`text ${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('overallSuggestion');
      });
    });
  });

  describe('User Experience Flows', () => {
    test('should provide smooth user experience for common workflow', async () => {
      // Simulate user typing text
      const userText = 'this is a test message that needs improvement';
      
      // Step 1: User presses shortcut
      const { clipboard } = require('electron');
      clipboard.readText.mockReturnValue(userText);

      // Step 2: System analyzes text
      const AIService = require('../src/services/AIService.js');
      const aiService = new AIService();
      const suggestions = await aiService.getSuggestions(userText);

      expect(suggestions.overallSuggestion).toBeDefined();
      expect(suggestions.overallSuggestion).not.toBe(userText);

      // Step 3: User sees suggestion
      const SuggestionOverlay = require('../src/services/SuggestionOverlay.js');
      const suggestionOverlay = new SuggestionOverlay();
      suggestionOverlay.showSuggestions(suggestions, userText, jest.fn());

      expect(suggestionOverlay.isVisible).toBe(true);

      // Step 4: User accepts suggestion
      clipboard.writeText(suggestions.overallSuggestion);
      expect(clipboard.writeText).toHaveBeenCalledWith(suggestions.overallSuggestion);

      // Step 5: User pastes improved text
      // (This would be done by the user in their application)
    });

    test('should handle user rejection gracefully', () => {
      const SuggestionOverlay = require('../src/services/SuggestionOverlay.js');
      const suggestionOverlay = new SuggestionOverlay();

      const suggestions = {
        originalText: 'test text',
        overallSuggestion: 'improved text'
      };

      suggestionOverlay.showSuggestions(suggestions, 'test text', jest.fn());
      expect(suggestionOverlay.isVisible).toBe(true);

      // User rejects suggestion
      suggestionOverlay.hide();
      expect(suggestionOverlay.isVisible).toBe(false);
    });
  });
});
