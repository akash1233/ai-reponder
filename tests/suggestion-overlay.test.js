/**
 * Tests for SuggestionOverlay
 * Tests the overlay window management and suggestion display functionality
 */

// Mock electron modules
jest.mock('electron', () => ({
  screen: {
    getCursorScreenPoint: jest.fn(() => ({ x: 100, y: 100 })),
    getPrimaryDisplay: jest.fn(() => ({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 }
    }))
  },
  BrowserWindow: jest.fn()
}));

describe('SuggestionOverlay', () => {
  let suggestionOverlay;
  let mockWindow;
  let mockWebContents;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock BrowserWindow
    mockWebContents = {
      send: jest.fn(),
      once: jest.fn(),
      on: jest.fn()
    };
    
    mockWindow = {
      loadFile: jest.fn(),
      show: jest.fn(),
      focus: jest.fn(),
      close: jest.fn(),
      isDestroyed: jest.fn(() => false),
      webContents: mockWebContents,
      setPosition: jest.fn(),
      setSize: jest.fn()
    };
    
    BrowserWindow.mockImplementation(() => mockWindow);
    
    // Import the service
    delete require.cache[require.resolve('../src/services/SuggestionOverlay.js')];
    const SuggestionOverlay = require('../src/services/SuggestionOverlay.js');
    suggestionOverlay = new SuggestionOverlay();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      expect(suggestionOverlay.overlayWindow).toBeNull();
      expect(suggestionOverlay.isVisible).toBe(false);
      expect(suggestionOverlay.currentSuggestions).toBeNull();
      expect(suggestionOverlay.callback).toBeNull();
    });
  });

  describe('Show Suggestions', () => {
    test('should create and show overlay window', () => {
      const suggestions = {
        originalText: 'test text',
        overallSuggestion: 'improved text',
        confidence: 0.8
      };
      const callback = jest.fn();

      suggestionOverlay.showSuggestions(suggestions, 'test text', callback);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 400,
          height: 300,
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          focusable: true,
          show: false
        })
      );

      expect(mockWindow.loadFile).toHaveBeenCalledWith('src/renderer/overlay.html');
      expect(suggestionOverlay.isVisible).toBe(true);
      expect(suggestionOverlay.currentSuggestions).toBe(suggestions);
      expect(suggestionOverlay.callback).toBe(callback);
    });

    test('should close existing overlay before creating new one', () => {
      // Create first overlay
      suggestionOverlay.overlayWindow = mockWindow;
      suggestionOverlay.isVisible = true;

      const suggestions = { overallSuggestion: 'new suggestion' };
      suggestionOverlay.showSuggestions(suggestions, 'text', jest.fn());

      expect(mockWindow.close).toHaveBeenCalled();
    });

    test('should send suggestions to overlay window after load', () => {
      const suggestions = {
        originalText: 'test text',
        overallSuggestion: 'improved text'
      };
      const callback = jest.fn();

      suggestionOverlay.showSuggestions(suggestions, 'test text', callback);

      // Simulate the did-finish-load event
      const loadCallback = mockWebContents.once.mock.calls.find(
        call => call[0] === 'did-finish-load'
      )[1];

      loadCallback();

      expect(mockWebContents.send).toHaveBeenCalledWith('show-suggestions', {
        suggestions: suggestions,
        originalText: 'test text'
      });
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    test('should handle window creation errors', () => {
      BrowserWindow.mockImplementation(() => {
        throw new Error('Window creation failed');
      });

      expect(() => {
        suggestionOverlay.showSuggestions({}, 'text', jest.fn());
      }).toThrow('Window creation failed');
    });
  });

  describe('Hide Overlay', () => {
    test('should hide and close overlay window', () => {
      suggestionOverlay.overlayWindow = mockWindow;
      suggestionOverlay.isVisible = true;

      suggestionOverlay.hide();

      expect(mockWindow.close).toHaveBeenCalled();
      expect(suggestionOverlay.overlayWindow).toBeNull();
      expect(suggestionOverlay.isVisible).toBe(false);
    });

    test('should handle hide when no window exists', () => {
      expect(() => {
        suggestionOverlay.hide();
      }).not.toThrow();
    });

    test('should handle hide when window is destroyed', () => {
      suggestionOverlay.overlayWindow = mockWindow;
      mockWindow.isDestroyed.mockReturnValue(true);

      suggestionOverlay.hide();

      expect(mockWindow.close).not.toHaveBeenCalled();
    });
  });

  describe('Position Overlay', () => {
    test('should position overlay near cursor', () => {
      const { screen } = require('electron');
      screen.getCursorScreenPoint.mockReturnValue({ x: 500, y: 300 });
      screen.getPrimaryDisplay.mockReturnValue({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 }
      });

      suggestionOverlay.overlayWindow = mockWindow;
      suggestionOverlay.positionOverlay();

      expect(mockWindow.setPosition).toHaveBeenCalled();
      expect(mockWindow.setSize).toHaveBeenCalled();
    });

    test('should handle cursor at screen edges', () => {
      const { screen } = require('electron');
      screen.getCursorScreenPoint.mockReturnValue({ x: 10, y: 10 });
      screen.getPrimaryDisplay.mockReturnValue({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 }
      });

      suggestionOverlay.overlayWindow = mockWindow;
      suggestionOverlay.positionOverlay();

      expect(mockWindow.setPosition).toHaveBeenCalled();
    });

    test('should handle cursor at bottom right', () => {
      const { screen } = require('electron');
      screen.getCursorScreenPoint.mockReturnValue({ x: 1900, y: 1000 });
      screen.getPrimaryDisplay.mockReturnValue({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 }
      });

      suggestionOverlay.overlayWindow = mockWindow;
      suggestionOverlay.positionOverlay();

      expect(mockWindow.setPosition).toHaveBeenCalled();
    });
  });

  describe('Window State Management', () => {
    test('should track visibility state correctly', () => {
      expect(suggestionOverlay.isVisible).toBe(false);

      suggestionOverlay.showSuggestions({}, 'text', jest.fn());
      expect(suggestionOverlay.isVisible).toBe(true);

      suggestionOverlay.hide();
      expect(suggestionOverlay.isVisible).toBe(false);
    });

    test('should check if overlay is showing', () => {
      expect(suggestionOverlay.isShowing()).toBe(false);

      suggestionOverlay.isVisible = true;
      expect(suggestionOverlay.isShowing()).toBe(true);
    });

    test('should handle window destruction', () => {
      suggestionOverlay.overlayWindow = mockWindow;
      suggestionOverlay.isVisible = true;

      // Simulate window destruction
      mockWindow.isDestroyed.mockReturnValue(true);
      suggestionOverlay.hide();

      expect(suggestionOverlay.overlayWindow).toBeNull();
      expect(suggestionOverlay.isVisible).toBe(false);
    });
  });

  describe('Callback Handling', () => {
    test('should store and use callback correctly', () => {
      const callback = jest.fn();
      const suggestions = { overallSuggestion: 'test' };

      suggestionOverlay.showSuggestions(suggestions, 'text', callback);

      expect(suggestionOverlay.callback).toBe(callback);
    });

    test('should clear callback on hide', () => {
      const callback = jest.fn();
      suggestionOverlay.showSuggestions({}, 'text', callback);
      suggestionOverlay.hide();

      expect(suggestionOverlay.callback).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle screen API errors', () => {
      const { screen } = require('electron');
      screen.getCursorScreenPoint.mockImplementation(() => {
        throw new Error('Screen API error');
      });

      suggestionOverlay.overlayWindow = mockWindow;

      expect(() => {
        suggestionOverlay.positionOverlay();
      }).toThrow('Screen API error');
    });

    test('should handle window method errors', () => {
      mockWindow.show.mockImplementation(() => {
        throw new Error('Window show error');
      });

      suggestionOverlay.overlayWindow = mockWindow;

      expect(() => {
        suggestionOverlay.showSuggestions({}, 'text', jest.fn());
      }).toThrow('Window show error');
    });
  });

  describe('Memory Management', () => {
    test('should clean up resources on hide', () => {
      suggestionOverlay.overlayWindow = mockWindow;
      suggestionOverlay.currentSuggestions = { test: 'data' };
      suggestionOverlay.callback = jest.fn();

      suggestionOverlay.hide();

      expect(suggestionOverlay.overlayWindow).toBeNull();
      expect(suggestionOverlay.currentSuggestions).toBeNull();
      expect(suggestionOverlay.callback).toBeNull();
    });

    test('should handle multiple show/hide cycles', () => {
      for (let i = 0; i < 5; i++) {
        suggestionOverlay.showSuggestions({}, `text ${i}`, jest.fn());
        suggestionOverlay.hide();
      }

      expect(suggestionOverlay.overlayWindow).toBeNull();
      expect(suggestionOverlay.isVisible).toBe(false);
    });
  });

  describe('Window Configuration', () => {
    test('should create window with correct properties', () => {
      suggestionOverlay.showSuggestions({}, 'text', jest.fn());

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 400,
          height: 300,
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          focusable: true,
          show: false,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
          }
        })
      );
    });

    test('should load correct HTML file', () => {
      suggestionOverlay.showSuggestions({}, 'text', jest.fn());

      expect(mockWindow.loadFile).toHaveBeenCalledWith('src/renderer/overlay.html');
    });
  });
});
