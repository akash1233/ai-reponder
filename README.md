# AI Reponder

A powerful AI-powered writing assistant that monitors text across desktop applications and provides real-time grammar and writing suggestions. Works seamlessly with Slack, Gmail, and any other desktop application.

## ✨ Features

- **Real-time Text Monitoring** - Detects text as you type or copy across any desktop application
- **AI-Powered Suggestions** - Uses Perplexity AI for intelligent grammar and writing improvements
- **Individual Fix Buttons** - Apply specific grammar fixes or improvements with one click
- **Visual Instructions** - Clear step-by-step guidance for text replacement
- **Cross-Platform** - Built with Electron for macOS, Windows, and Linux
- **Desktop Integration** - Works with any application, not just web browsers
- **Intuitive UI** - Clean, modern interface with loading states and notifications

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Perplexity AI API key (hardcoded for easy setup)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/akash1233/ai-reponder.git
   cd ai-reponder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your Perplexity API key
   # Get your key from: https://www.perplexity.ai/settings/api
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Create desktop shortcut** (macOS)
   ```bash
   ./create-desktop-icon.sh
   ```

## 📖 How to Use

1. **Start the app** - Launch AI Reponder from the desktop shortcut or terminal
2. **Type or copy text** - In any application (Slack, Gmail, etc.)
3. **Get suggestions** - AI Reponder will automatically detect and analyze your text
4. **Apply improvements** - Click individual fix buttons or apply the complete rewrite
5. **Paste improvements** - Use Cmd+V to paste the improved text back

## 🎯 Supported Applications

- **Slack** (Desktop & Web)
- **Gmail** (Desktop & Web)
- **Microsoft Word**
- **Google Docs**
- **Notion**
- **Any text editor or application**

## 🔧 Configuration

The app requires a Perplexity AI API key to function. Follow the setup instructions below.

### Advanced Configuration

You can modify the AI provider in `src/services/AIService.js`:

```javascript
// Environment variable configuration
this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || null;
```

### **Environment Setup**

Create a `.env` file in the project root:

```bash
# .env
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

## 🏗️ Architecture

```
ai-reponder/
├── src/
│   ├── main.js              # Electron main process
│   ├── renderer/
│   │   ├── index.html       # Main UI
│   │   ├── renderer.js      # Frontend logic
│   │   └── styles.css       # Styling
│   └── services/
│       ├── AIService.js     # AI integration (Perplexity)
│       ├── TextMonitor.js   # Text detection & replacement
│       └── SlackIntegration.js # Slack-specific features
├── create-desktop-icon.sh   # Desktop shortcut creator
├── launch-app.sh           # App launcher
└── package.json
```

## 🛠️ Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## 📱 Screenshots

![AI Reponder Interface](screenshots/main-interface.png)
*Clean, intuitive interface with real-time suggestions*

![Text Replacement](screenshots/text-replacement.png)
*Visual instructions for easy text replacement*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Perplexity AI](https://www.perplexity.ai/) for providing the AI capabilities
- [Electron](https://www.electronjs.org/) for the cross-platform desktop framework
- [Axios](https://axios-http.com/) for HTTP requests

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/akash1233/ai-reponder/issues) page
2. Create a new issue with detailed information
3. Include your operating system and error messages

## 🔮 Roadmap

- [ ] Multiple AI provider support (OpenAI, Claude)
- [ ] Custom writing styles and tones
- [ ] Export functionality for suggestions
- [ ] Settings persistence
- [ ] Auto-updater
- [ ] Plugin system for custom integrations

---

**Made with ❤️ for better writing everywhere**
