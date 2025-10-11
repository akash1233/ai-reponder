# AI Reponder

AI-powered writing assistant that monitors text across desktop applications and provides real-time grammar and writing suggestions using Perplexity AI.

## Features

- **Real-time Text Monitoring**: Monitors text input across desktop and web applications
- **AI-Powered Suggestions**: Uses Perplexity AI for intelligent text analysis and rewriting
- **Multiple Writing Styles**: Professional, casual, creative, technical, and custom prompts
- **Global Keyboard Shortcuts**: Quick access with customizable shortcuts
- **Floating Overlay**: Non-intrusive suggestion display
- **Suggestion History**: Track accepted and rejected suggestions
- **Dark Mode**: Modern UI with dark/light theme support
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-reponser
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your Perplexity API key
```

4. Run the application:
```bash
npm start
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### Keyboard Shortcuts

Default shortcuts:
- `Cmd+Shift+T` (macOS) / `Ctrl+Shift+T` (Windows/Linux): Auto-copy and analyze text
- `Cmd+Shift+Space` (macOS) / `Ctrl+Shift+Space` (Windows/Linux): Alternative auto-copy
- `Cmd+Shift+C` (macOS) / `Ctrl+Shift+C` (Windows/Linux): Analyze clipboard content

Shortcuts can be customized through the settings panel.

### Writing Styles

The app supports multiple writing styles:

- **Professional**: Clean, crisp, and unambiguous writing
- **Casual**: Friendly and conversational tone
- **Creative**: Engaging language with personality
- **Technical**: Precise, industry-specific terminology
- **Custom**: User-defined prompts

## Usage

1. **Start the app**: Launch AI Reponder from the Applications folder or run `npm start`
2. **Select text**: In any application, select the text you want to improve
3. **Trigger analysis**: Press `Cmd+Shift+T` to auto-copy and analyze, or `Cmd+Shift+C` to analyze clipboard
4. **Review suggestions**: The floating overlay will show AI-powered suggestions
5. **Accept or reject**: Click "Copy" to accept a suggestion or "Ignore" to reject it
6. **Paste improved text**: Use `Cmd+V` to paste the improved text

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Test Structure

The test suite includes:

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Mock Tests**: External dependency simulation

Test files are located in the `tests/` directory:

- `main.test.js` - Main Electron process tests
- `ai-service.test.js` - AI service and API integration tests
- `text-monitor.test.js` - Text monitoring and clipboard tests
- `suggestion-overlay.test.js` - Overlay window management tests
- `renderer.test.js` - UI and renderer process tests
- `integration.test.js` - End-to-end workflow tests

### Building

```bash
# Build for current platform
npm run build

# Build for specific platform
npm run build -- --mac
npm run build -- --win
npm run build -- --linux
```

## Architecture

### Main Components

1. **Main Process** (`src/main.js`): Electron main process handling app lifecycle, IPC, and global shortcuts
2. **AIService** (`src/services/AIService.js`): Perplexity AI integration and suggestion processing
3. **TextMonitor** (`src/services/TextMonitor.js`): Clipboard monitoring and text detection
4. **SuggestionOverlay** (`src/services/SuggestionOverlay.js`): Floating overlay window management
5. **Renderer** (`src/renderer/`): UI components and user interactions

### Data Flow

1. User presses global shortcut
2. TextMonitor captures text from clipboard
3. AIService processes text with Perplexity AI
4. SuggestionOverlay displays suggestions
5. User accepts/rejects suggestions
6. Improved text is copied to clipboard

## API Integration

### Perplexity AI

The app uses Perplexity AI's `sonar-pro` model for text analysis:

- **Endpoint**: `https://api.perplexity.ai/chat/completions`
- **Model**: `sonar-pro`
- **Max Tokens**: 300
- **Temperature**: 0.2

### Request Format

```json
{
  "model": "sonar-pro",
  "messages": [
    {
      "role": "user",
      "content": "Rewrite the message professionally..."
    }
  ],
  "max_tokens": 300,
  "temperature": 0.2
}
```

## Troubleshooting

### Common Issues

1. **App not responding to shortcuts**: Check system permissions for accessibility
2. **Suggestions not appearing**: Verify Perplexity API key is set correctly
3. **Overlay not showing**: Check if overlay window is being blocked by other applications

### Debug Mode

Run with debug logging:
```bash
npm run dev
```

Check console output for detailed logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- Perplexity AI integration
- Global keyboard shortcuts
- Floating suggestion overlay
- Multiple writing styles
- Dark mode support
- Suggestion history
- Cross-platform support