# Mac App Packaging Guide

This guide explains how to package the AI Responder app for macOS with Apple Liquid Retina display support.

## 🚀 Quick Start

### Build Mac App (DMG + ZIP)
```bash
npm run build:mac
```

### Build Only DMG
```bash
npm run build:mac-dmg
```

### Build Only ZIP
```bash
npm run build:mac-zip
```

### Build All Platforms
```bash
npm run build:all
```

## 📱 Apple Liquid Retina Display Support

The app is configured with:
- **High-resolution icons** (up to 1024x1024)
- **Retina-optimized UI** with proper scaling
- **Dark mode support** for macOS
- **Native macOS integration** with proper entitlements

## 🎨 Icon Generation

### Generated Icon Features
- **Apple Liquid Retina optimized** design
- **High-resolution vector graphics** (1024x1024 base)
- **Modern gradient background** with SF Pro Display font
- **AI-themed neural network** visualization
- **Proper shadow and opacity** effects for macOS

### Creating the .icns File

1. **Use the generated SVG**:
   ```bash
   node assets/generate-icon.js
   ```

2. **Convert to .icns** using one of these methods:

   **Method A: Using macOS iconutil**
   ```bash
   # Create iconset directory
   mkdir icon.iconset
   
   # Export PNGs from SVG in these sizes:
   # 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
   
   # Name them as:
   # icon_16x16.png, icon_16x16@2x.png (32x32), etc.
   
   # Create .icns
   iconutil -c icns icon.iconset
   ```

   **Method B: Online Tools**
   - [IconVerticons](https://iconverticons.com/online/)
   - [CloudConvert](https://cloudconvert.com/svg-to-icns)

3. **Place the .icns file**:
   ```bash
   cp icon.icns assets/icon.icns
   ```

## 📦 Build Configuration

### Mac App Settings
- **App ID**: `com.ai-reponder.app`
- **Product Name**: `AI Responder`
- **Category**: Productivity
- **Architecture**: Universal (x64 + ARM64)
- **Dark Mode**: Supported
- **Hardened Runtime**: Enabled

### Output Formats
- **DMG**: Disk image for easy installation
- **ZIP**: Compressed archive for distribution

### File Structure
```
dist/
├── AI Responder-1.0.0.dmg          # DMG installer
├── AI Responder-1.0.0-mac.zip      # ZIP archive
└── mac/
    ├── AI Responder.app/            # Mac application bundle
    └── ...
```

## 🔐 Code Signing (Optional)

For distribution outside the Mac App Store:

1. **Get Developer ID** from Apple Developer Program
2. **Install certificates** in Keychain
3. **Set environment variables**:
   ```bash
   export CSC_NAME="Developer ID Application: Your Name"
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="your-password"
   ```

4. **Build with signing**:
   ```bash
   npm run build:mac
   ```

## 🚀 Distribution

### DMG Installation
1. Users download the `.dmg` file
2. Double-click to mount the disk image
3. Drag `AI Responder.app` to Applications folder
4. Eject the disk image

### ZIP Installation
1. Users download the `.zip` file
2. Extract the archive
3. Move `AI Responder.app` to Applications folder

## 🛠️ Troubleshooting

### Common Issues

**"App is damaged and can't be opened"**
```bash
# Remove quarantine attribute
xattr -cr "AI Responder.app"
```

**"App can't be opened because it is from an unidentified developer"**
- Go to System Preferences > Security & Privacy
- Click "Open Anyway" next to the app name

**Build fails with icon error**
- Ensure `assets/icon.icns` exists
- Check icon file is valid: `file assets/icon.icns`

**Build fails with entitlements error**
- Ensure `assets/entitlements.mac.plist` exists
- Check entitlements file is valid XML

### Debug Build
```bash
# Build with verbose output
DEBUG=electron-builder npm run build:mac

# Check build configuration
npx electron-builder --help
```

## 📋 Requirements

- **macOS**: 10.15+ (Catalina or later)
- **Node.js**: 18+ 
- **Xcode Command Line Tools**: `xcode-select --install`
- **Electron Builder**: Already installed as dev dependency

## 🎯 Next Steps

1. **Generate proper icon**: Run `node assets/generate-icon.js` and convert to .icns
2. **Test the build**: Run `npm run build:mac`
3. **Test installation**: Install the generated DMG
4. **Code signing** (optional): Set up certificates for distribution
5. **Notarization** (optional): Submit to Apple for notarization

## 📚 Resources

- [Electron Builder Documentation](https://www.electron.build/)
- [macOS App Store Guidelines](https://developer.apple.com/app-store/guidelines/)
- [Code Signing Guide](https://developer.apple.com/developer-id/)
- [Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
