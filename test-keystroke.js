#!/usr/bin/env node

// Test script for keystroke capture
const TextMonitor = require('./src/services/TextMonitor');

console.log('🧪 Testing Enhanced Keystroke Capture');
console.log('=====================================');
console.log('');

const monitor = new TextMonitor();

// Test callback
monitor.start((text) => {
  console.log(`📝 Captured text: "${text}"`);
  console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
  console.log('');
});

console.log('✅ Enhanced text monitoring started!');
console.log('📝 Try typing some text in any application...');
console.log('🔄 The app will detect and process your text automatically');
console.log('');
console.log('Press Ctrl+C to stop testing');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping text monitoring...');
  await monitor.stop();
  console.log('✅ Test completed');
  process.exit(0);
});
