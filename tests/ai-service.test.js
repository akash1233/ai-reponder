/**
 * Tests for AIService
 * Tests the AI integration functionality including Perplexity API
 */

const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key, defaultValue) => {
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
  }));
});

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn()
    }))
  }))
}));

describe('AIService', () => {
  let aiService;
  let mockAxios;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = axios;
    
    // Set up environment variables
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    
    // Import the service
    delete require.cache[require.resolve('../src/services/AIService.js')];
    const AIService = require('../src/services/AIService.js');
    aiService = new AIService();
  });

  describe('Initialization', () => {
    test('should initialize with Perplexity API key from environment', () => {
      expect(aiService.perplexityApiKey).toBe('test-perplexity-key');
      expect(aiService.geminiApiKey).toBeNull();
    });

    test('should handle missing API key gracefully', () => {
      delete process.env.PERPLEXITY_API_KEY;
      const AIService = require('../src/services/AIService.js');
      const service = new AIService();
      expect(service.perplexityApiKey).toBeNull();
    });
  });

  describe('Perplexity API Integration', () => {
    test('should make successful API request to Perplexity', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'This is a professionally rewritten version of the text.'
            }
          }]
        }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await aiService.getPerplexitySuggestions('test text', {
        isSlack: false,
        context: 'general',
        promptTemplate: 'Rewrite professionally'
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        expect.objectContaining({
          model: 'sonar-pro',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('test text')
            })
          ]),
          max_tokens: 300,
          temperature: 0.2
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-perplexity-key',
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toHaveProperty('originalText', 'test text');
      expect(result).toHaveProperty('overallSuggestion');
    });

    test('should handle Perplexity API errors', async () => {
      const mockError = new Error('API Error');
      mockAxios.post.mockRejectedValue(mockError);

      await expect(aiService.getPerplexitySuggestions('test text', {}))
        .rejects.toThrow('API Error');
    });

    test('should clean API key before sending request', async () => {
      // Set a dirty API key with hidden characters
      aiService.perplexityApiKey = '  test-key\r\n\t  ';
      
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Test response'
            }
          }]
        }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await aiService.getPerplexitySuggestions('test text', {});

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });
  });

  describe('Prompt Building', () => {
    test('should build prompt with custom template', async () => {
      const prompt = await aiService.buildPrompt('test text', {
        promptTemplate: 'Custom rewrite instruction'
      });

      expect(prompt).toContain('Custom rewrite instruction');
      expect(prompt).toContain('test text');
      expect(prompt).toContain('single, best rewritten version');
    });

    test('should build prompt with Slack context', async () => {
      const prompt = await aiService.buildPrompt('test text', {
        isSlack: true,
        context: 'slack'
      });

      expect(prompt).toContain('Slack - keep it concise and friendly');
    });

    test('should use default template when none provided', async () => {
      const prompt = await aiService.buildPrompt('test text', {});

      expect(prompt).toContain('professionally, slick and without any ambiguity');
    });

    test('should handle store errors gracefully', async () => {
      // Mock store to throw error
      const Store = require('electron-store');
      Store.mockImplementation(() => ({
        get: jest.fn(() => {
          throw new Error('Store error');
        })
      }));

      const prompt = await aiService.buildPrompt('test text', {});
      expect(prompt).toContain('professionally, slick and without any ambiguity');
    });
  });

  describe('Suggestion Parsing', () => {
    test('should parse simple AI response', () => {
      const response = 'This is a professionally rewritten version.';
      const result = aiService.parseSuggestions(response, 'original text');

      expect(result).toHaveProperty('originalText', 'original text');
      expect(result).toHaveProperty('overallSuggestion', 'This is a professionally rewritten version.');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle quoted responses', () => {
      const response = '"This is a quoted response."';
      const result = aiService.parseSuggestions(response, 'original text');

      expect(result.overallSuggestion).toBe('This is a quoted response.');
    });

    test('should handle escaped quotes', () => {
      const response = 'This is a response with \\"escaped quotes\\".';
      const result = aiService.parseSuggestions(response, 'original text');

      expect(result.overallSuggestion).toBe('This is a response with "escaped quotes".');
    });

    test('should filter out metadata lines', () => {
      const response = `
        Original text: test
        Here's a suggestion:
        This is the actual suggestion.
        Suggestion: another one
      `;
      const result = aiService.parseSuggestions(response, 'test');

      expect(result.overallSuggestion).toBe('This is the actual suggestion.');
    });

    test('should score suggestions based on quality', () => {
      const response = `
        Short
        This is a longer, more complete sentence with proper punctuation.
        Another short one
      `;
      const result = aiService.parseSuggestions(response, 'test');

      expect(result.overallSuggestion).toBe('This is a longer, more complete sentence with proper punctuation.');
    });

    test('should handle empty or invalid responses', () => {
      const result1 = aiService.parseSuggestions('', 'test');
      expect(result1.overallSuggestion).toBe('test');
      expect(result1.confidence).toBe(0.1);

      const result2 = aiService.parseSuggestions(null, 'test');
      expect(result2.overallSuggestion).toBe('test');
    });
  });

  describe('Similarity Calculation', () => {
    test('should calculate similarity between strings', () => {
      const similarity = aiService.calculateSimilarity('hello world', 'hello world');
      expect(similarity).toBe(1.0);

      const similarity2 = aiService.calculateSimilarity('hello', 'world');
      expect(similarity2).toBeLessThan(0.5);
    });

    test('should handle empty strings', () => {
      const similarity = aiService.calculateSimilarity('', '');
      expect(similarity).toBe(1.0);

      const similarity2 = aiService.calculateSimilarity('hello', '');
      expect(similarity2).toBe(0);
    });
  });

  describe('Levenshtein Distance', () => {
    test('should calculate edit distance correctly', () => {
      const distance1 = aiService.levenshteinDistance('hello', 'hello');
      expect(distance1).toBe(0);

      const distance2 = aiService.levenshteinDistance('hello', 'world');
      expect(distance2).toBe(4);

      const distance3 = aiService.levenshteinDistance('kitten', 'sitting');
      expect(distance3).toBe(3);
    });
  });

  describe('Main getSuggestions Method', () => {
    test('should use Perplexity by default', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Professional rewrite'
            }
          }]
        }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await aiService.getSuggestions('test text');

      expect(mockAxios.post).toHaveBeenCalled();
      expect(result).toHaveProperty('overallSuggestion');
    });

    test('should pass options to Perplexity', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Slack-friendly rewrite'
            }
          }]
        }
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      await aiService.getSuggestions('test text', {
        isSlack: true,
        context: 'slack',
        promptTemplate: 'Make it casual'
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Slack')
            })
          ])
        }),
        expect.any(Object)
      );
    });

    test('should handle errors gracefully', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(aiService.getSuggestions('test text'))
        .rejects.toThrow('Network error');
    });
  });

  describe('Gemini Integration (Disabled)', () => {
    test('should not use Gemini when disabled', async () => {
      const result = await aiService.getSuggestions('test text', {
        provider: 'gemini'
      });

      // Should fall back to Perplexity or throw error
      expect(result).toBeDefined();
    });
  });
});
