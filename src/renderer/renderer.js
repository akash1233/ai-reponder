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
});

// Configuration panel setup
function setupConfigPanel() {
    settingsBtn.addEventListener('click', () => {
        configPanel.style.display = 'flex';
    });
    
    closeConfigBtn.addEventListener('click', () => {
        configPanel.style.display = 'none';
    });
    
    // Shortcut change buttons
    document.querySelectorAll('.change-shortcut-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            changeShortcut(action);
        });
    });
    
}

// Configuration management
async function loadConfig() {
    try {
        // Load shortcuts from main process
        const shortcuts = await ipcRenderer.invoke('get-shortcuts');
        
        // Update UI
        document.getElementById('autoCopyShortcut').value = shortcuts.autoCopy || 'Cmd+Shift+T';
        document.getElementById('altAutoCopyShortcut').value = shortcuts.altAutoCopy || 'Cmd+Shift+Space';
        document.getElementById('analyzeClipboardShortcut').value = shortcuts.analyzeClipboard || 'Cmd+Shift+C';
        
        // Update display
        updateShortcutDisplay();
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

async function saveConfig() {
    try {
        // Save shortcuts to main process
        const shortcuts = {
            autoCopy: document.getElementById('autoCopyShortcut').value,
            altAutoCopy: document.getElementById('altAutoCopyShortcut').value,
            analyzeClipboard: document.getElementById('analyzeClipboardShortcut').value
        };
        
        // Update each shortcut
        for (const [action, shortcut] of Object.entries(shortcuts)) {
            await ipcRenderer.invoke('update-shortcut', { action, shortcut });
        }
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

function changeShortcut(action) {
    const input = document.getElementById(action + 'Shortcut');
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
    document.getElementById('displayAutoCopyShortcut').textContent = document.getElementById('autoCopyShortcut').value;
    document.getElementById('displayAltAutoCopyShortcut').textContent = document.getElementById('altAutoCopyShortcut').value;
    document.getElementById('displayAnalyzeClipboardShortcut').textContent = document.getElementById('analyzeClipboardShortcut').value;
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
           updateStatus('Suggestion rejected', 'warning');
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