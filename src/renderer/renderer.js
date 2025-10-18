const { ipcRenderer } = require('electron');

// History tracking
let suggestionHistory = [];
let acceptedCount = 0;
let rejectedCount = 0;

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const acceptedCountEl = document.getElementById('acceptedCount');
const rejectedCountEl = document.getElementById('rejectedCount');
const historyList = document.getElementById('historyList');
const settingsBtn = document.getElementById('settingsBtn');
const configPanel = document.getElementById('configPanel');
const closeConfigBtn = document.getElementById('closeConfigBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const activePromptSelect = document.getElementById('activePrompt');
const savePromptsBtn = document.getElementById('savePromptsBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateStatus('Ready', 'ready');
    loadHistory();
    updateStats();
    setupConfigPanel();
    loadConfig();
    setupThemeToggle();
    loadTheme();
    setupPromptsConfig();
    loadPrompts();
    setupApiKeysConfig();
});

// Configuration panel setup
function setupConfigPanel() {
    settingsBtn.addEventListener('click', () => {
        configPanel.style.display = 'flex';
    });
    
    closeConfigBtn.addEventListener('click', () => {
        configPanel.style.display = 'none';
    });
    
    // Shortcut change button
    const changeShortcutBtn = document.getElementById('changeShortcutBtn');
    if (changeShortcutBtn) {
        changeShortcutBtn.addEventListener('click', () => {
            changeShortcut();
        });
    }
    
}

// Configuration management
async function loadConfig() {
    try {
        // Load shortcut from main process
        const shortcut = await ipcRenderer.invoke('get-shortcut');
        
        // Update UI
        document.getElementById('shortcutInput').value = shortcut || 'Cmd+Shift+T';
        
        // Update display
        updateShortcutDisplay();
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

async function saveConfig() {
    try {
        // Save shortcut to main process
        const shortcut = document.getElementById('shortcutInput').value;
        await ipcRenderer.invoke('update-shortcut', shortcut);
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

function changeShortcut() {
    const input = document.getElementById('shortcutInput');
    const oldValue = input.value;
    
    input.value = 'Press new shortcut...';
    input.readOnly = false;
    input.focus();
    
    const handleKeyDown = async (e) => {
        e.preventDefault();
        const modifiers = [];
        
        if (e.metaKey) modifiers.push('CommandOrControl');
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        
        const key = e.key === ' ' ? 'Space' : e.key;
        const newShortcut = modifiers.length > 0 ? modifiers.join('+') + '+' + key : key;
        
        input.value = newShortcut;
        input.readOnly = true;
        input.blur();
        
        // Save the new shortcut
        await saveConfig();
        updateShortcutDisplay();
        
        document.removeEventListener('keydown', handleKeyDown);
    };
    
    document.addEventListener('keydown', handleKeyDown);
}

function updateShortcutDisplay() {
    document.getElementById('displayShortcut').textContent = document.getElementById('shortcutInput').value;
}

// Theme Management
function setupThemeToggle() {
    // Header theme toggle
    themeToggleBtn.addEventListener('click', () => {
        toggleTheme();
    });
    
    // Settings panel toggle
    darkModeToggle.addEventListener('change', (e) => {
        setTheme(e.target.checked ? 'dark' : 'light');
    });
}

function loadTheme() {
    const savedTheme = localStorage.getItem('ai-reponder-theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    darkModeToggle.checked = theme === 'dark';
    localStorage.setItem('ai-reponder-theme', theme);
    
    // Update theme toggle button state
    const sunIcon = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');
    
    if (theme === 'dark') {
        sunIcon.style.opacity = '0';
        moonIcon.style.opacity = '1';
    } else {
        sunIcon.style.opacity = '1';
        moonIcon.style.opacity = '0';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Prompts Management
function setupPromptsConfig() {
    // Active prompt selector
    activePromptSelect.addEventListener('change', (e) => {
        showPromptTemplate(e.target.value);
    });
    
    // Save prompts button
    savePromptsBtn.addEventListener('click', () => {
        savePrompts();
    });
}

async function loadPrompts() {
    try {
        const prompts = await ipcRenderer.invoke('get-prompts');
        
        // Set active prompt
        activePromptSelect.value = prompts.activePrompt || 'professional';
        showPromptTemplate(activePromptSelect.value);
        
        // Load prompt templates
        Object.keys(prompts.templates).forEach(template => {
            const textarea = document.querySelector(`[data-template="${template}"] .prompt-textarea`);
            if (textarea) {
                textarea.value = prompts.templates[template];
            }
        });
    } catch (error) {
        console.error('Error loading prompts:', error);
    }
}

function showPromptTemplate(template) {
    // Hide all templates
    document.querySelectorAll('.prompt-template').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected template
    const selectedTemplate = document.querySelector(`[data-template="${template}"]`);
    if (selectedTemplate) {
        selectedTemplate.classList.add('active');
    }
}

async function savePrompts() {
    try {
        const templates = {};
        document.querySelectorAll('.prompt-template').forEach(template => {
            const templateName = template.dataset.template;
            const textarea = template.querySelector('.prompt-textarea');
            if (textarea) {
                templates[templateName] = textarea.value;
            }
        });
        
        const prompts = {
            activePrompt: activePromptSelect.value,
            templates: templates
        };
        
        await ipcRenderer.invoke('save-prompts', prompts);
        
        // Show success feedback
        savePromptsBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Saved!
        `;
        savePromptsBtn.style.background = 'var(--accent-success)';
        
        setTimeout(() => {
            savePromptsBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H16L21 8V19A2 2 0 0 1 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Save Prompts
            `;
            savePromptsBtn.style.background = 'var(--accent-primary)';
        }, 2000);
        
    } catch (error) {
        console.error('Error saving prompts:', error);
    }
}


// Update status indicator
function updateStatus(text, status) {
    statusText.textContent = text;
    statusDot.className = `status-dot ${status}`;
}

// Update statistics
function updateStats() {
    acceptedCountEl.textContent = acceptedCount;
    rejectedCountEl.textContent = rejectedCount;
}

// Add suggestion to history
function addToHistory(originalText, suggestion, action) {
    const historyItem = {
        id: Date.now(),
        originalText: originalText,
        suggestion: suggestion,
        action: action, // 'accepted' or 'rejected'
        timestamp: new Date()
    };
    
    suggestionHistory.unshift(historyItem);
    
    // Keep only last 50 items
    if (suggestionHistory.length > 50) {
        suggestionHistory = suggestionHistory.slice(0, 50);
    }
    
    // Update counts
    if (action === 'accepted') {
        acceptedCount++;
    } else if (action === 'rejected') {
        rejectedCount++;
    }
    
    updateStats();
    renderHistory();
    saveHistory();
}

// Render history list
function renderHistory() {
    if (suggestionHistory.length === 0) {
        historyList.innerHTML = `
            <div class="no-history">
                <p>No suggestions yet. Use <strong>Cmd+Shift+T</strong> to get started!</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = suggestionHistory.map(item => `
        <div class="history-item ${item.action}">
            <div class="history-item-header">
                <span class="history-item-status ${item.action}">${item.action}</span>
                <span class="history-item-time">${formatTime(item.timestamp)}</span>
            </div>
            <div class="history-item-text">
                <strong>Original:</strong> ${truncateText(item.originalText, 100)}<br>
                <strong>Suggestion:</strong> ${truncateText(item.suggestion, 100)}
            </div>
        </div>
    `).join('');
}

// Format time
function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Save history to localStorage
function saveHistory() {
    localStorage.setItem('ai-reponder-history', JSON.stringify({
        history: suggestionHistory,
        acceptedCount: acceptedCount,
        rejectedCount: rejectedCount
    }));
}

// Load history from localStorage
function loadHistory() {
    try {
        const saved = localStorage.getItem('ai-reponder-history');
        if (saved) {
            const data = JSON.parse(saved);
            suggestionHistory = data.history || [];
            acceptedCount = data.acceptedCount || 0;
            rejectedCount = data.rejectedCount || 0;
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

       // Listen for suggestion events from main process
       ipcRenderer.on('suggestion-accepted', (event, data) => {
           addToHistory(data.originalText, data.suggestion, 'accepted');
           updateStatus('Suggestion accepted!', 'success');
           setTimeout(() => updateStatus('Ready', 'ready'), 2000);
       });

       ipcRenderer.on('suggestion-rejected', (event, data) => {
           addToHistory(data.originalText, data.suggestion, 'rejected');
           updateStatus('Suggestion rejected', 'error');
           setTimeout(() => updateStatus('Ready', 'ready'), 2000);
       });

       // Listen for text analysis events
       ipcRenderer.on('text-suggestions', (event, data) => {
           updateStatus('AI suggestions ready!', 'processing');
           setTimeout(() => updateStatus('Ready', 'ready'), 1000);
       });

       // Listen for app status updates
       ipcRenderer.on('app-status', (event, status) => {
           updateStatus(status.message, status.type);
       });

// Clear history function (for future use)
function clearHistory() {
    suggestionHistory = [];
    acceptedCount = 0;
    rejectedCount = 0;
    updateStats();
    renderHistory();
    saveHistory();
}

// API Keys Configuration
function setupApiKeysConfig() {
    const perplexityInput = document.getElementById('perplexityApiKey');
    const geminiInput = document.getElementById('geminiApiKey');
    const testKeysBtn = document.getElementById('testKeysBtn');
    const saveKeysBtn = document.getElementById('saveKeysBtn');
    
    // Load existing API keys
    loadApiKeys();
    
    // Setup visibility toggles
    document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.closest('button').dataset.target;
            const input = document.getElementById(targetId);
            const eyeIcon = e.target.closest('button').querySelector('.eye-icon');
            const eyeOffIcon = e.target.closest('button').querySelector('.eye-off-icon');
            
            if (input.type === 'password') {
                input.type = 'text';
                eyeIcon.style.display = 'none';
                eyeOffIcon.style.display = 'block';
            } else {
                input.type = 'password';
                eyeIcon.style.display = 'block';
                eyeOffIcon.style.display = 'none';
            }
        });
    });
    
    // Setup input validation
    [perplexityInput, geminiInput].forEach(input => {
        input.addEventListener('input', () => {
            validateApiKey(input);
        });
    });
    
    // Setup test keys button
    testKeysBtn.addEventListener('click', async () => {
        await testApiKeys();
    });
    
    // Setup save keys button
    saveKeysBtn.addEventListener('click', () => {
        saveApiKeys();
    });
}

function loadApiKeys() {
    // Load from localStorage or request from main process
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
        try {
            const keys = JSON.parse(savedKeys);
            document.getElementById('perplexityApiKey').value = keys.perplexity || '';
            document.getElementById('geminiApiKey').value = keys.gemini || '';
            updateApiKeyStatus();
        } catch (error) {
            console.error('Error loading API keys:', error);
        }
    }
    
    // Also try to get from main process
    ipcRenderer.invoke('get-api-keys').then(keys => {
        if (keys) {
            document.getElementById('perplexityApiKey').value = keys.perplexity || '';
            document.getElementById('geminiApiKey').value = keys.gemini || '';
            updateApiKeyStatus();
        }
    }).catch(error => {
        console.error('Error getting API keys from main process:', error);
    });
}

function validateApiKey(input) {
    const value = input.value.trim();
    const statusEl = document.getElementById(input.id.replace('ApiKey', 'Status'));
    const indicator = statusEl.querySelector('.status-indicator');
    const text = statusEl.querySelector('.status-text');
    
    if (!value) {
        indicator.className = 'status-indicator';
        text.className = 'status-text';
        text.textContent = 'Not configured';
        return false;
    }
    
    // Basic validation
    let isValid = false;
    if (input.id === 'perplexityApiKey') {
        isValid = value.startsWith('pplx-') || value.startsWith('pplx_');
    } else if (input.id === 'geminiApiKey') {
        isValid = value.startsWith('AIza') && value.length > 20;
    }
    
    if (isValid) {
        indicator.className = 'status-indicator valid';
        text.className = 'status-text valid';
        text.textContent = 'Valid format';
    } else {
        indicator.className = 'status-indicator invalid';
        text.className = 'status-text invalid';
        text.textContent = 'Invalid format';
    }
    
    return isValid;
}

function updateApiKeyStatus() {
    const perplexityInput = document.getElementById('perplexityApiKey');
    const geminiInput = document.getElementById('geminiApiKey');
    
    validateApiKey(perplexityInput);
    validateApiKey(geminiInput);
}

async function testApiKeys() {
    const perplexityKey = document.getElementById('perplexityApiKey').value.trim();
    const geminiKey = document.getElementById('geminiApiKey').value.trim();
    const testBtn = document.getElementById('testKeysBtn');
    
    if (!perplexityKey && !geminiKey) {
        console.error('Please enter at least one API key to test.');
        return;
    }
    
    // Disable button and show loading
    testBtn.disabled = true;
    testBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="animate-spin">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
        </svg>
        Testing...
    `;
    
    try {
        const result = await ipcRenderer.invoke('test-api-keys', {
            perplexity: perplexityKey,
            gemini: geminiKey
        });
        
        // Update status indicators
        updateTestResults(result);
        
        if (result.success) {
            console.log('API keys tested successfully!');
        } else {
            console.error(`API key test failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Error testing API keys:', error);
        console.error(`Error testing API keys: ${error.message}`);
    } finally {
        // Re-enable button
        testBtn.disabled = false;
        testBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            Test API Keys
        `;
    }
}

function updateTestResults(result) {
    const perplexityStatus = document.getElementById('perplexityStatus');
    const geminiStatus = document.getElementById('geminiStatus');
    
    // Update Perplexity status
    const perplexityIndicator = perplexityStatus.querySelector('.status-indicator');
    const perplexityText = perplexityStatus.querySelector('.status-text');
    
    if (result.perplexity && result.perplexity.success) {
        perplexityIndicator.className = 'status-indicator valid';
        perplexityText.className = 'status-text valid';
        perplexityText.textContent = 'Working';
    } else if (result.perplexity && !result.perplexity.success) {
        perplexityIndicator.className = 'status-indicator invalid';
        perplexityText.className = 'status-text invalid';
        perplexityText.textContent = 'Failed';
    }
    
    // Update Gemini status
    const geminiIndicator = geminiStatus.querySelector('.status-indicator');
    const geminiText = geminiStatus.querySelector('.status-text');
    
    if (result.gemini && result.gemini.success) {
        geminiIndicator.className = 'status-indicator valid';
        geminiText.className = 'status-text valid';
        geminiText.textContent = 'Working';
    } else if (result.gemini && !result.gemini.success) {
        geminiIndicator.className = 'status-indicator invalid';
        geminiText.className = 'status-text invalid';
        geminiText.textContent = 'Failed';
    }
}

function saveApiKeys() {
    const perplexityKey = document.getElementById('perplexityApiKey').value.trim();
    const geminiKey = document.getElementById('geminiApiKey').value.trim();
    
    if (!perplexityKey && !geminiKey) {
        console.error('Please enter at least one API key.');
        return;
    }
    
    const keys = {
        perplexity: perplexityKey,
        gemini: geminiKey
    };
    
    // Save to localStorage
    localStorage.setItem('apiKeys', JSON.stringify(keys));
    
    // Send to main process
    ipcRenderer.send('save-api-keys', keys);
    
    // Update status
    updateApiKeyStatus();
    
    // Show success message
    const saveBtn = document.getElementById('saveKeysBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Saved!
    `;
    saveBtn.style.background = 'var(--accent-success)';
    
    setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.style.background = '';
    }, 2000);
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateApiKey,
        loadApiKeys,
        saveApiKeys,
        testApiKeys,
        updateApiKeyStatus,
        updateTestResults
    };
}
