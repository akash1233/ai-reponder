/**
 * Tests for TextMonitor
 * Tests the text monitoring and clipboard functionality
 */

// Mock electron modules
jest.mock('electron', () => ({
  clipboard: {
    readText: jest.fn(),
    writeText: jest.fn()
  },
  globalShortcut: {
    register: jest.fn(),
    unregister: jest.fn()
  }
}));

describe('TextMonitor', () => {
  let textMonitor;
  let mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
    
    // Import the service
    delete require.cache[require.resolve('../src/services/TextMonitor.js')];
    const TextMonitor = require('../src/services/TextMonitor.js');
    textMonitor = new TextMonitor();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      expect(textMonitor.isMonitoring).toBe(false);
      expect(textMonitor.lastClipboard).toBe('');
      expect(textMonitor.currentText).toBe('');
      expect(textMonitor.textBuffer).toBe('');
      expect(textMonitor.callback).toBeNull();
    });

    test('should have proper configuration', () => {
      expect(textMonitor.maxBufferSize).toBe(1000);
      expect(textMonitor.maxHistorySize).toBe(10);
      expect(textMonitor.shortcutCooldown).toBe(1000);
    });
  });

  describe('Monitoring Control', () => {
    test('should start monitoring with callback', async () => {
      await textMonitor.start(mockCallback);
      
      expect(textMonitor.isMonitoring).toBe(true);
      expect(textMonitor.callback).toBe(mockCallback);
    });

    test('should stop monitoring and clear intervals', async () => {
      // Start monitoring first
      await textMonitor.start(mockCallback);
      
      // Mock intervals
      textMonitor.clipboardInterval = setInterval(() => {}, 100);
      textMonitor.keyboardInterval = setInterval(() => {}, 100);
      textMonitor.windowInterval = setInterval(() => {}, 100);
      textMonitor.typingTimeout = setTimeout(() => {}, 100);

      await textMonitor.stop();
      
      expect(textMonitor.isMonitoring).toBe(false);
      expect(textMonitor.callback).toBeNull();
    });

    test('should handle stop when not monitoring', async () => {
      await textMonitor.stop();
      expect(textMonitor.isMonitoring).toBe(false);
    });
  });

  describe('Clipboard Monitoring', () => {
    test('should detect clipboard changes', async () => {
      const { clipboard } = require('electron');
      
      // Mock clipboard content changes
      clipboard.readText
        .mockReturnValueOnce('') // Initial empty
        .mockReturnValueOnce('old text') // First change
        .mockReturnValueOnce('new text'); // Second change

      await textMonitor.start(mockCallback);
      textMonitor.startClipboardMonitoring();

      // Simulate clipboard monitoring
      textMonitor.lastClipboard = '';
      textMonitor.processText = jest.fn();

      // Trigger clipboard check
      const interval = textMonitor.clipboardInterval;
      if (interval) {
        // Simulate the interval callback
        const callback = interval._onTimeout || interval;
        if (typeof callback === 'function') {
          callback();
        }
      }

      expect(clipboard.readText).toHaveBeenCalled();
    });

    test('should not process same clipboard content', async () => {
      const { clipboard } = require('electron');
      clipboard.readText.mockReturnValue('same text');

      await textMonitor.start(mockCallback);
      textMonitor.lastClipboard = 'same text';
      textMonitor.processText = jest.fn();

      // Simulate clipboard check
      const interval = textMonitor.clipboardInterval;
      if (interval) {
        const callback = interval._onTimeout || interval;
        if (typeof callback === 'function') {
          callback();
        }
      }

      expect(textMonitor.processText).not.toHaveBeenCalled();
    });
  });

  describe('Text Processing', () => {
    test('should process valid text', () => {
      textMonitor.callback = mockCallback;
      textMonitor.processText('This is a valid text for analysis');

      expect(mockCallback).toHaveBeenCalledWith('This is a valid text for analysis');
      expect(textMonitor.currentText).toBe('This is a valid text for analysis');
    });

    test('should not process text that is too short', () => {
      textMonitor.callback = mockCallback;
      textMonitor.processText('Hi');

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should not process empty text', () => {
      textMonitor.callback = mockCallback;
      textMonitor.processText('');

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should not process text without letters', () => {
      textMonitor.callback = mockCallback;
      textMonitor.processText('12345');

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should not process text that is too long', () => {
      textMonitor.callback = mockCallback;
      const longText = 'a'.repeat(2001);
      textMonitor.processText(longText);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should not process same text multiple times', () => {
      textMonitor.callback = mockCallback;
      textMonitor.currentText = 'test text';
      
      textMonitor.processText('test text');
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Typed Text Detection', () => {
    test('should identify typed text correctly', () => {
      expect(textMonitor.isTypedText('This is a sentence with spaces.')).toBe(true);
      expect(textMonitor.isTypedText('Hello world!')).toBe(true);
      expect(textMonitor.isTypedText('A complete sentence.')).toBe(true);
    });

    test('should reject non-typed text', () => {
      expect(textMonitor.isTypedText('')).toBe(false);
      expect(textMonitor.isTypedText('Hi')).toBe(false); // Too short
      expect(textMonitor.isTypedText('12345')).toBe(false); // No letters
      expect(textMonitor.isTypedText('A'.repeat(1001))).toBe(false); // Too long
      expect(textMonitor.isTypedText('HEADER TEXT')).toBe(false); // All caps
      expect(textMonitor.isTypedText('!!!')).toBe(false); // Just symbols
    });

    test('should reject multi-line content', () => {
      const multiLineText = `Line 1
Line 2
Line 3
Line 4`;
      expect(textMonitor.isTypedText(multiLineText)).toBe(false);
    });

    test('should reject content with tabs', () => {
      expect(textMonitor.isTypedText('Text\twith\ttabs')).toBe(false);
    });

    test('should maintain text history', () => {
      textMonitor.isTypedText('first text');
      textMonitor.isTypedText('second text');
      
      expect(textMonitor.textHistory).toContain('first text');
      expect(textMonitor.textHistory).toContain('second text');
    });

    test('should not process recent text', () => {
      textMonitor.textHistory = ['recent text'];
      
      expect(textMonitor.isTypedText('recent text')).toBe(false);
    });

    test('should limit history size', () => {
      // Add more than maxHistorySize items
      for (let i = 0; i < 15; i++) {
        textMonitor.isTypedText(`text ${i}`);
      }
      
      expect(textMonitor.textHistory.length).toBeLessThanOrEqual(textMonitor.maxHistorySize);
    });
  });

  describe('Text Replacement', () => {
    test('should copy new text to clipboard', async () => {
      const { clipboard } = require('electron');
      
      const result = await textMonitor.replaceText('old text', 'new text');
      
      expect(clipboard.writeText).toHaveBeenCalledWith('new text');
      expect(result.success).toBe(true);
      expect(result.originalText).toBe('old text');
      expect(result.newText).toBe('new text');
    });

    test('should handle clipboard write errors', async () => {
      const { clipboard } = require('electron');
      clipboard.writeText.mockImplementation(() => {
        throw new Error('Clipboard error');
      });

      const result = await textMonitor.replaceText('old text', 'new text');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Clipboard error');
    });

    test('should store replacement text for reference', async () => {
      await textMonitor.replaceText('original', 'replacement');
      
      expect(textMonitor.originalText).toBe('original');
      expect(textMonitor.replacementText).toBe('replacement');
    });
  });

  describe('Current Text Retrieval', () => {
    test('should get current text from clipboard', async () => {
      const { clipboard } = require('electron');
      clipboard.readText.mockReturnValue('current clipboard text');

      const result = await textMonitor.getCurrentText();
      
      expect(result).toBe('current clipboard text');
      expect(clipboard.readText).toHaveBeenCalled();
    });

    test('should handle clipboard read errors', async () => {
      const { clipboard } = require('electron');
      clipboard.readText.mockImplementation(() => {
        throw new Error('Clipboard read error');
      });

      const result = await textMonitor.getCurrentText();
      
      expect(result).toBe('');
    });
  });

  describe('Typing State Management', () => {
    test('should set typing state when processing text', () => {
      textMonitor.processText('test text');
      
      expect(textMonitor.isTyping).toBe(true);
    });

    test('should clear typing state after timeout', (done) => {
      textMonitor.processText('test text');
      expect(textMonitor.isTyping).toBe(true);
      
      // Wait for timeout
      setTimeout(() => {
        expect(textMonitor.isTyping).toBe(false);
        done();
      }, 1100);
    });

    test('should clear existing timeout when new text is processed', () => {
      textMonitor.processText('first text');
      const firstTimeout = textMonitor.typingTimeout;
      
      textMonitor.processText('second text');
      
      expect(textMonitor.typingTimeout).not.toBe(firstTimeout);
    });
  });

  describe('Error Handling', () => {
    test('should handle clipboard monitoring errors silently', async () => {
      const { clipboard } = require('electron');
      clipboard.readText.mockImplementation(() => {
        throw new Error('Clipboard error');
      });

      await textMonitor.start(mockCallback);
      textMonitor.startClipboardMonitoring();

      // Should not throw error
      expect(() => {
        const interval = textMonitor.clipboardInterval;
        if (interval) {
          const callback = interval._onTimeout || interval;
          if (typeof callback === 'function') {
            callback();
          }
        }
      }).not.toThrow();
    });

    test('should handle processText errors gracefully', () => {
      textMonitor.callback = jest.fn(() => {
        throw new Error('Callback error');
      });

      expect(() => {
        textMonitor.processText('test text');
      }).not.toThrow();
    });
  });
});
