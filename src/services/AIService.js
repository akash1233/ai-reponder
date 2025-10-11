const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.geminiClient = null;
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || null;
    this.geminiApiKey = null;
  }

  async initializeGemini(apiKey) {
    if (!apiKey) return false;
    
    try {
      this.geminiClient = new GoogleGenerativeAI(apiKey);
      this.geminiApiKey = apiKey;
      return true;
    } catch (error) {
      console.error('Error initializing Gemini:', error);
      return false;
    }
  }

  async initializePerplexity(apiKey) {
    if (!apiKey) return false;
    
    try {
      // Clean and validate the API key
      const cleanApiKey = apiKey.trim().replace(/[\r\n\t]/g, '');
      
      // Validate API key format (more flexible)
      if (!cleanApiKey.startsWith('pplx-') && !cleanApiKey.startsWith('pplx_')) {
        console.error('Invalid Perplexity API key format. Should start with "pplx-" or "pplx_"');
        return false;
      }
      
      this.perplexityApiKey = cleanApiKey;
      console.log('Perplexity API key initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Perplexity:', error);
      return false;
    }
  }

  async getSuggestions(text, options = {}) {
    const { isSlack = false, context = 'general', provider = 'auto' } = options;
    
    try {
      // Always use Perplexity AI (hardcoded)
      if (provider === 'auto') {
        console.log('Using Perplexity AI (hardcoded)');
        return await this.getPerplexitySuggestions(text, { isSlack, context });
      } else if (provider === 'gemini' && this.geminiClient) {
        return await this.getGeminiSuggestions(text, { isSlack, context });
      } else if (provider === 'perplexity' && this.perplexityApiKey) {
        return await this.getPerplexitySuggestions(text, { isSlack, context });
      } else {
        throw new Error('No AI provider configured');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      throw error;
    }
  }

  async getGeminiSuggestions(text, options) {
    const models = ["gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];
    
    for (const modelName of models) {
      try {
        console.log(`Trying Gemini model: ${modelName}`);
        const model = this.geminiClient.getGenerativeModel({ model: modelName });
        
        const prompt = this.buildPrompt(text, options);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const suggestions = response.text();
        
        console.log(`Successfully used model: ${modelName}`);
        return this.parseSuggestions(suggestions, text);
      } catch (error) {
        console.log(`Model ${modelName} failed:`, error.message);
        if (modelName === models[models.length - 1]) {
          // If this is the last model, throw the error
          console.error('All Gemini models failed:', error);
          throw error;
        }
        // Otherwise, try the next model
        continue;
      }
    }
  }

  async getPerplexitySuggestions(text, options) {
    try {
      const prompt = this.buildPrompt(text, options);
      
      // Clean the API key to remove any hidden characters
      const cleanApiKey = this.perplexityApiKey.trim().replace(/[\r\n\t]/g, '');
      
      console.log('Using Perplexity API key (first 10 chars):', cleanApiKey.substring(0, 10) + '...');
      
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const suggestions = response.data.choices[0].message.content;
      return this.parseSuggestions(suggestions, text);
    } catch (error) {
      console.error('Perplexity API error:', error);
      throw error;
    }
  }

  buildPrompt(text, options) {
    const { isSlack, context } = options;
    
    let basePrompt = `Improve this text: "${text}"

Provide suggestions for:
1. Grammar fixes
2. Better word choices
3. Clearer phrasing
4. Professional tone

Format your response as:
- Grammar: [fixes]
- Improvements: [suggestions]
- Better version: [rewritten text]`;

    if (isSlack) {
      basePrompt += `\n\nThis is for Slack - keep it concise and friendly.`;
    }

    return basePrompt;
  }

  parseSuggestions(aiResponse, originalText) {
    try {
      // Try to parse as JSON first
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          originalText,
          grammarIssues: parsed.grammar_issues || [],
          improvements: parsed.improvements || [],
          toneSuggestions: parsed.tone_suggestions || [],
          overallSuggestion: parsed.overall_suggestion || originalText,
          confidence: 0.8
        };
      }
    } catch (error) {
      console.log('Could not parse JSON response, using fallback parsing');
    }

    // Fallback: parse as plain text
    return this.parseTextResponse(aiResponse, originalText);
  }

  parseTextResponse(response, originalText) {
    const suggestions = {
      originalText,
      grammarIssues: [],
      improvements: [],
      toneSuggestions: [],
      overallSuggestion: originalText,
      confidence: 0.6
    };

    // Simple text parsing for fallback
    const lines = response.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.toLowerCase().includes('grammar') || line.toLowerCase().includes('error')) {
        suggestions.grammarIssues.push({
          original: originalText,
          suggested: line,
          explanation: 'Grammar improvement suggested'
        });
      } else if (line.toLowerCase().includes('improve') || line.toLowerCase().includes('better')) {
        suggestions.improvements.push({
          original: originalText,
          suggested: line,
          explanation: 'Writing improvement suggested'
        });
      } else if (line.length > 10 && !line.includes(':')) {
        suggestions.overallSuggestion = line;
      }
    }

    return suggestions;
  }

  // Method to get grammar check specifically
  async getGrammarCheck(text) {
    const suggestions = await this.getSuggestions(text, { 
      isSlack: false, 
      context: 'grammar' 
    });
    
    return {
      originalText: text,
      correctedText: suggestions.overallSuggestion,
      issues: suggestions.grammarIssues,
      confidence: suggestions.confidence
    };
  }

  // Method to get tone adjustment
  async getToneAdjustment(text, targetTone = 'professional') {
    const suggestions = await this.getSuggestions(text, { 
      isSlack: false, 
      context: 'tone',
      targetTone 
    });
    
    return {
      originalText: text,
      adjustedText: suggestions.overallSuggestion,
      toneSuggestions: suggestions.toneSuggestions,
      confidence: suggestions.confidence
    };
  }

  // Method to check if API keys are configured
  getStatus() {
    return {
      gemini: !!this.geminiClient,
      perplexity: !!this.perplexityApiKey,
      hasAnyProvider: !!(this.geminiClient || this.perplexityApiKey)
    };
  }
}

module.exports = AIService;


