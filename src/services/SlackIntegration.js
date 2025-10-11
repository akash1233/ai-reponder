const { app } = require('electron');
const activeWin = require('active-win');

class SlackIntegration {
  constructor() {
    this.slackWindowTitles = [
      'Slack',
      'slack',
      'Slack - ',
      'slack - '
    ];
    this.currentWindowTitle = '';
    this.isSlackActive = false;
  }

  async isSlackText(text) {
    // Check if Slack is currently the active window
    const isSlackActive = await this.checkIfSlackIsActive();
    
    // Additional heuristics to detect Slack messages
    const isSlackMessage = this.detectSlackMessage(text);
    
    return isSlackActive || isSlackMessage;
  }

  async checkIfSlackIsActive() {
    try {
      // Get the current active window
      const window = await activeWin();
      if (window && window.title) {
        this.currentWindowTitle = window.title;
        
        // Check if the title contains Slack indicators
        const isSlack = this.slackWindowTitles.some(title => 
          window.title.includes(title)
        ) || window.owner.name.toLowerCase().includes('slack');
        
        this.isSlackActive = isSlack;
        return isSlack;
      }
    } catch (error) {
      console.error('Error checking active window:', error);
    }
    
    return false;
  }

  detectSlackMessage(text) {
    // Heuristics to detect if text is likely a Slack message
    
    // Check for Slack-specific patterns
    const slackPatterns = [
      /^@\w+/, // @mentions
      /<@\w+>/, // Slack user mentions
      /<#\w+\|[\w\s-]+>/, // Channel mentions
      /<!here>/, // @here
      /<!channel>/, // @channel
      /<!everyone>/, // @everyone
      /:[\w-]+:/, // Emoji codes
      /\*[\w\s]+\*/, // Bold text
      /_[\w\s]+_/, // Italic text
      /~[\w\s]+~/, // Strikethrough
      /```[\s\S]*```/, // Code blocks
      /`[^`]+`/, // Inline code
    ];

    // Check for Slack formatting
    const hasSlackFormatting = slackPatterns.some(pattern => pattern.test(text));
    
    // Check for typical Slack message characteristics
    const isShortMessage = text.length < 500;
    const hasMultipleLines = text.includes('\n');
    const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
    
    // Check for common Slack phrases
    const slackPhrases = [
      'thanks!', 'thank you!', 'np', 'no problem',
      'sounds good', 'looks good', 'lgtm', 'gtg',
      'brb', 'afk', 'ttyl', 'fyi', 'imo', 'imho',
      'wfm', 'sgtm', 'wrt', 'tl;dr', 'tldr'
    ];
    
    const hasSlackPhrases = slackPhrases.some(phrase => 
      text.toLowerCase().includes(phrase)
    );

    // Score the likelihood of being a Slack message
    let score = 0;
    if (hasSlackFormatting) score += 3;
    if (isShortMessage) score += 1;
    if (hasEmojis) score += 1;
    if (hasSlackPhrases) score += 2;
    if (hasMultipleLines && isShortMessage) score += 1;

    return score >= 3;
  }

  async getSlackContext() {
    const isSlackActive = await this.checkIfSlackIsActive();
    
    if (!isSlackActive) {
      return {
        isSlack: false,
        context: 'general'
      };
    }

    // Try to determine the Slack context
    let context = 'general';
    
    if (this.currentWindowTitle) {
      const title = this.currentWindowTitle.toLowerCase();
      
      if (title.includes('direct message') || title.includes('dm')) {
        context = 'dm';
      } else if (title.includes('channel') || title.includes('#')) {
        context = 'channel';
      } else if (title.includes('thread')) {
        context = 'thread';
      }
    }

    return {
      isSlack: true,
      context: context,
      windowTitle: this.currentWindowTitle
    };
  }

  // Method to format text for Slack
  formatForSlack(text, options = {}) {
    const { 
      useFormatting = true, 
      addEmojis = false, 
      tone = 'professional' 
    } = options;

    let formattedText = text;

    if (useFormatting) {
      // Apply basic Slack formatting
      formattedText = this.applySlackFormatting(formattedText);
    }

    if (addEmojis && tone === 'friendly') {
      // Add appropriate emojis for friendly tone
      formattedText = this.addSlackEmojis(formattedText);
    }

    return formattedText;
  }

  applySlackFormatting(text) {
    // Convert markdown-style formatting to Slack formatting
    let formatted = text;
    
    // Bold text: **text** -> *text*
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '*$1*');
    
    // Italic text: *text* -> _text_
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '_$1_');
    
    // Code blocks: ```code``` -> ```code```
    // (already in correct format)
    
    // Inline code: `code` -> `code`
    // (already in correct format)
    
    return formatted;
  }

  addSlackEmojis(text) {
    // Add appropriate emojis based on content
    let withEmojis = text;
    
    // Add emojis for common phrases
    const emojiMap = {
      'thanks': '🙏',
      'thank you': '🙏',
      'welcome': '👋',
      'great': '👍',
      'good': '👍',
      'awesome': '🚀',
      'congratulations': '🎉',
      'happy': '😊',
      'sad': '😢',
      'thinking': '🤔',
      'working': '💪',
      'done': '✅',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };

    for (const [phrase, emoji] of Object.entries(emojiMap)) {
      const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
      withEmojis = withEmojis.replace(regex, `${phrase} ${emoji}`);
    }

    return withEmojis;
  }

  // Method to detect if user is typing in Slack
  async isTypingInSlack() {
    const isSlackActive = await this.checkIfSlackIsActive();
    
    if (!isSlackActive) return false;

    // Additional checks could be added here, such as:
    // - Checking if the cursor is in a text input field
    // - Monitoring for specific keyboard events
    // - Checking window focus and text selection

    return true;
  }

  // Method to get suggested improvements for Slack messages
  getSlackSpecificSuggestions(text, context = 'general') {
    const suggestions = [];

    // Check message length
    if (text.length > 4000) {
      suggestions.push({
        type: 'length',
        message: 'Message is very long. Consider breaking it into multiple messages or using a thread.',
        severity: 'warning'
      });
    }

    // Check for proper formatting
    if (text.includes('@') && !text.match(/<@\w+>/)) {
      suggestions.push({
        type: 'formatting',
        message: 'Consider using proper Slack mentions: <@username>',
        severity: 'info'
      });
    }

    // Check for channel context
    if (context === 'channel' && text.length < 10) {
      suggestions.push({
        type: 'context',
        message: 'Channel messages should be more substantial. Consider adding more detail.',
        severity: 'info'
      });
    }

    // Check for thread context
    if (context === 'thread' && text.length > 200) {
      suggestions.push({
        type: 'context',
        message: 'Thread replies should be concise. Consider moving detailed content to a new message.',
        severity: 'info'
      });
    }

    return suggestions;
  }
}

module.exports = SlackIntegration;
