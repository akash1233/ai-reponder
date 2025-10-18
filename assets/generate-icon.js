#!/usr/bin/env node

/**
 * Generate Apple Liquid Retina Display Icon
 * Creates a high-resolution icon suitable for Mac apps
 */

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon for AI Responder
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#007AFF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5856D6;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background circle with gradient -->
  <circle cx="512" cy="512" r="480" fill="url(#gradient)" filter="url(#shadow)"/>
  
  <!-- AI Brain/Neural Network Icon -->
  <g fill="white" opacity="0.9">
    <!-- Main brain shape -->
    <path d="M 300 400 Q 300 300 400 300 L 624 300 Q 724 300 724 400 Q 724 500 624 500 L 400 500 Q 300 500 300 400 Z" />
    
    <!-- Neural network nodes -->
    <circle cx="350" cy="350" r="12" fill="white" opacity="0.8"/>
    <circle cx="450" cy="350" r="12" fill="white" opacity="0.8"/>
    <circle cx="550" cy="350" r="12" fill="white" opacity="0.8"/>
    <circle cx="650" cy="350" r="12" fill="white" opacity="0.8"/>
    
    <circle cx="350" cy="400" r="12" fill="white" opacity="0.8"/>
    <circle cx="450" cy="400" r="12" fill="white" opacity="0.8"/>
    <circle cx="550" cy="400" r="12" fill="white" opacity="0.8"/>
    <circle cx="650" cy="400" r="12" fill="white" opacity="0.8"/>
    
    <circle cx="350" cy="450" r="12" fill="white" opacity="0.8"/>
    <circle cx="450" cy="450" r="12" fill="white" opacity="0.8"/>
    <circle cx="550" cy="450" r="12" fill="white" opacity="0.8"/>
    <circle cx="650" cy="450" r="12" fill="white" opacity="0.8"/>
    
    <!-- Connection lines -->
    <g stroke="white" stroke-width="2" opacity="0.6" fill="none">
      <line x1="350" y1="350" x2="450" y2="400"/>
      <line x1="450" y1="350" x2="550" y2="400"/>
      <line x1="550" y1="350" x2="650" y2="400"/>
      <line x1="350" y1="400" x2="450" y2="450"/>
      <line x1="450" y1="400" x2="550" y2="450"/>
      <line x1="550" y1="400" x2="650" y2="450"/>
    </g>
    
    <!-- AI text -->
    <text x="512" y="600" font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif" 
          font-size="120" font-weight="600" text-anchor="middle" fill="white" opacity="0.9">
      AI
    </text>
    
    <!-- Subtitle -->
    <text x="512" y="680" font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif" 
          font-size="48" font-weight="400" text-anchor="middle" fill="white" opacity="0.7">
      Responder
    </text>
  </g>
</svg>`;

// Write the SVG file
fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgIcon);

console.log('✅ Generated icon.svg');
console.log('');
console.log('To create the .icns file for Mac app packaging:');
console.log('');
console.log('1. Open icon.svg in a vector graphics editor (like Figma, Sketch, or Adobe Illustrator)');
console.log('2. Export as PNG in these sizes:');
console.log('   - 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024');
console.log('3. Use the following command to create the .icns file:');
console.log('');
console.log('   iconutil -c icns icon.iconset');
console.log('');
console.log('   Where icon.iconset contains:');
console.log('   - icon_16x16.png');
console.log('   - icon_16x16@2x.png (32x32)');
console.log('   - icon_32x32.png');
console.log('   - icon_32x32@2x.png (64x64)');
console.log('   - icon_128x128.png');
console.log('   - icon_128x128@2x.png (256x256)');
console.log('   - icon_256x256.png');
console.log('   - icon_256x256@2x.png (512x512)');
console.log('   - icon_512x512.png');
console.log('   - icon_512x512@2x.png (1024x1024)');
console.log('');
console.log('Alternatively, you can use online tools like:');
console.log('- https://iconverticons.com/online/');
console.log('- https://cloudconvert.com/svg-to-icns');
console.log('');
console.log('The generated icon features:');
console.log('- Apple Liquid Retina display optimized design');
console.log('- High-resolution vector graphics (1024x1024 base)');
console.log('- Modern gradient background with SF Pro Display font');
console.log('- AI-themed neural network visualization');
console.log('- Proper shadow and opacity effects for macOS');
