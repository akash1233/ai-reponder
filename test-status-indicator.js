/**
 * Test script to verify status indicator behavior
 */

const { app, BrowserWindow } = require('electron');

// Create a test window to check status indicator
function createTestWindow() {
  const testWindow = new BrowserWindow({
    width: 450,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: true
  });

  testWindow.loadFile('src/renderer/index.html');
  
  // Test status updates after window loads
  testWindow.webContents.once('did-finish-load', () => {
    console.log('Testing status indicator...');
    
    // Test different status states
    const statuses = [
      { text: 'Ready', status: 'ready' },
      { text: 'Processing...', status: 'processing' },
      { text: 'Error occurred', status: 'error' },
      { text: 'Success!', status: 'success' }
    ];
    
    let index = 0;
    const testInterval = setInterval(() => {
      if (index < statuses.length) {
        const { text, status } = statuses[index];
        console.log(`Testing: ${text} (${status})`);
        
        // Send status update to renderer
        testWindow.webContents.send('app-status', {
          message: text,
          type: status
        });
        
        index++;
      } else {
        clearInterval(testInterval);
        console.log('Status indicator test completed!');
        console.log('Check the app window to verify:');
        console.log('- Ready status should be GREEN');
        console.log('- Processing status should be ORANGE with pulse');
        console.log('- Error status should be RED');
        console.log('- Success status should be GREEN');
        console.log('- Status text should not be clipped');
      }
    }, 2000);
  });
}

app.whenReady().then(() => {
  createTestWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
