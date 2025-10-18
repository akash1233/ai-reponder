const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.geminiClient = null;
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || null;
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    
    // Initialize Gemini if API key is available and not undefined
    if (this.geminiApiKey && this.geminiApiKey !== 'undefined') {
      this.initializeGemini(this.geminiApiKey);
    }
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
    const { isSlack = false, context = 'general', provider = 'auto', promptTemplate } = options;
    
    try {
      // Auto-select provider based on availability
      if (provider === 'auto') {
        if (this.geminiClient) {
          console.log('Using Gemini AI (auto-selected)');
          return await this.getGeminiSuggestions(text, { isSlack, context, promptTemplate });
        } else if (this.perplexityApiKey) {
          console.log('Using Perplexity AI (auto-selected)');
          return await this.getPerplexitySuggestions(text, { isSlack, context, promptTemplate });
        } else {
          throw new Error('No AI provider configured');
        }
      } else if (provider === 'gemini' && this.geminiClient) {
        console.log('Using Gemini AI (explicitly requested)');
        return await this.getGeminiSuggestions(text, { isSlack, context, promptTemplate });
      } else if (provider === 'perplexity' && this.perplexityApiKey) {
        console.log('Using Perplexity AI (explicitly requested)');
        return await this.getPerplexitySuggestions(text, { isSlack, context, promptTemplate });
      } else {
        throw new Error('No AI provider configured');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      throw error;
    }
  }

  async getGeminiSuggestions(text, options) {
    const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    
    for (const modelName of models) {
      try {
        console.log(`Trying Gemini model: ${modelName}`);
        const model = this.geminiClient.getGenerativeModel({ model: modelName });
        
        const prompt = await this.buildPrompt(text, options);
        
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
      const prompt = await this.buildPrompt(text, options);
      
      // Clean the API key to remove any hidden characters
      const cleanApiKey = this.perplexityApiKey.trim().replace(/[\r\n\t]/g, '');
      
      console.log('🚀 Sending to Perplexity API:');
      console.log('📝 Original text:', text);
      console.log('🎯 Prompt:', prompt);
      console.log('⚙️ Options:', options);
      console.log('🔑 Using Perplexity API key (first 10 chars):', cleanApiKey.substring(0, 10) + '...');
      
      const requestData = {
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.2
      };
      
      console.log('📤 Request payload:', JSON.stringify(requestData, null, 2));
      
      const response = await axios.post('https://api.perplexity.ai/chat/completions', requestData, {
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Perplexity API Response:');
      console.log('📊 Status:', response.status);
      console.log('📋 Full response:', JSON.stringify(response.data, null, 2));
      
      const suggestions = response.data.choices[0].message.content;
      console.log('🎯 Raw suggestions content:', suggestions);
      
      const parsedSuggestions = this.parseSuggestions(suggestions, text);
      console.log('✨ Parsed suggestions:', JSON.stringify(parsedSuggestions, null, 2));
      
      return parsedSuggestions;
    } catch (error) {
      console.error('❌ Perplexity API error:', error);
      if (error.response) {
        console.error('📥 Error response data:', error.response.data);
        console.error('📊 Error status:', error.response.status);
      }
      throw error;
    }
  }

  async buildPrompt(text, options) {
    const { isSlack, context, promptTemplate } = options;
    
    // Get the active prompt template from store if not provided
    let template = promptTemplate;
    if (!template) {
      try {
        const Store = require('electron-store');
        const store = new Store();
        const prompts = store.get('prompts', {
          activePrompt: 'professional',
          templates: {
            professional: 'Rewrite the message professionally, slick and without any ambiguity, keep it crisp and clean. Focus on clarity, conciseness, and professional tone while maintaining the original meaning.',
            casual: 'Rewrite this message in a more casual, friendly tone while keeping it clear and engaging. Make it sound natural and conversational.',
            creative: 'Rewrite this message with more creative and engaging language. Add personality and flair while maintaining clarity and impact.',
            technical: 'Rewrite this message with precise, technical language. Use industry terminology and maintain accuracy while improving clarity and structure.',
            custom: 'Rewrite the message according to your specific requirements...'
          }
        });
        
        template = prompts.templates[prompts.activePrompt] || prompts.templates.professional;
      } catch (error) {
        console.error('Error loading prompt template:', error);
        template = 'Rewrite the message professionally, slick and without any ambiguity, keep it crisp and clean.';
      }
    }

    let basePrompt = `${template}

Original text: "${text}"

Please provide a single, best rewritten version that improves the message while maintaining its core meaning. Focus on clarity, conciseness, and the desired tone.`;

    if (isSlack) {
      basePrompt += `\n\nThis is for Slack - keep it concise and friendly while maintaining professionalism.`;
    }

    return basePrompt;
  }

  parseSuggestions(aiResponse, originalText) {
    console.log('🔍 Parsing AI response:', aiResponse);
    
    try {
      // Clean the response first
      let cleanResponse = aiResponse.trim();
      
      // Remove surrounding quotes if present
      if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
        cleanResponse = cleanResponse.slice(1, -1);
      }
      
      // Remove escaped quotes
      cleanResponse = cleanResponse.replace(/\\"/g, '"');
      
      // Try to find the best suggestion
      const lines = cleanResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      console.log('📝 Cleaned lines:', lines);
      
      // Look for the best suggestion - prioritize longer, meaningful content
      let bestSuggestion = originalText;
      let maxScore = 0;
      
      for (const line of lines) {
        // Skip lines that are clearly metadata or instructions
        if (line.toLowerCase().includes('original text:') ||
            line.toLowerCase().includes('here\'s') ||
            line.toLowerCase().includes('suggestion:') ||
            line.toLowerCase().includes('rewritten:') ||
            line.toLowerCase().includes('improved:') ||
            line.startsWith('-') ||
            line.startsWith('*') ||
            line.startsWith('1.') ||
            line.startsWith('2.') ||
            line.startsWith('3.') ||
            line.length < 10) {
          continue;
        }
        
        // Score the line based on length and content quality
        let score = line.length;
        
        // Bonus for lines that look like complete sentences
        if (line.includes('.') || line.includes('!') || line.includes('?')) {
          score += 20;
        }
        
        // Bonus for lines that don't repeat the original exactly
        if (line !== originalText) {
          score += 10;
        }
        
        // Penalty for lines that are too similar to original
        const similarity = this.calculateSimilarity(line, originalText);
        if (similarity > 0.8) {
          score -= 30;
        }
        
        console.log(`📊 Line: "${line}" - Score: ${score}`);
        
        if (score > maxScore) {
          bestSuggestion = line;
          maxScore = score;
        }
      }
      
      console.log('🎯 Best suggestion found:', bestSuggestion);
      
      return {
        originalText,
        grammarIssues: [],
        improvements: [],
        toneSuggestions: [],
        overallSuggestion: bestSuggestion,
        confidence: Math.min(0.9, maxScore / 100)
      };
      
    } catch (error) {
      console.error('Error parsing suggestions:', error);
      return {
        originalText,
        grammarIssues: [],
        improvements: [],
        toneSuggestions: [],
        overallSuggestion: originalText,
        confidence: 0.1
      };
    }
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
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

    // Clean the response - remove extra quotes and formatting
    let cleanResponse = response.trim();
    
    // Remove surrounding quotes if present
    if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
      cleanResponse = cleanResponse.slice(1, -1);
    }
    
    // Remove escaped quotes
    cleanResponse = cleanResponse.replace(/\\"/g, '"');
    
    // Look for the actual suggestion content
    // Perplexity often returns the suggestion directly or with minimal formatting
    const lines = cleanResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Find the best suggestion - look for the longest meaningful line
    let bestSuggestion = originalText;
    let maxLength = 0;
    
    for (const line of lines) {
      // Skip lines that are clearly metadata or instructions
      if (line.toLowerCase().includes('grammar:') || 
          line.toLowerCase().includes('improvements:') ||
          line.toLowerCase().includes('better version:') ||
          line.toLowerCase().includes('original text:') ||
          line.toLowerCase().includes('suggestions:') ||
          line.startsWith('-') ||
          line.startsWith('*') ||
          line.length < 10) {
        continue;
      }
      
      // This looks like a real suggestion
      if (line.length > maxLength && line !== originalText) {
        bestSuggestion = line;
        maxLength = line.length;
      }
    }
    
    // If we found a good suggestion, use it
    if (bestSuggestion !== originalText) {
      suggestions.overallSuggestion = bestSuggestion;
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


