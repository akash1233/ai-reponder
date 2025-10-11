const { ipcRenderer } = require('electron');

class UIManager {
    constructor() {
        this.currentSuggestions = null;
        this.isMonitoring = false;
        this.settings = {};
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
        this.updateMonitoringStatus();
    }

    initializeElements() {
        // Status elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        
        // Panels
        this.settingsPanel = document.getElementById('settingsPanel');
        this.suggestionsPanel = document.getElementById('suggestionsPanel');
        
        // Settings elements
        this.aiProvider = document.getElementById('aiProvider');
        this.geminiKey = document.getElementById('geminiKey');
        this.perplexityKey = document.getElementById('perplexityKey');
        this.autoReplace = document.getElementById('autoReplace');
        this.showSuggestions = document.getElementById('showSuggestions');
        this.grammarCheck = document.getElementById('grammarCheck');
        this.toneAdjustment = document.getElementById('toneAdjustment');
        
        // Suggestion elements
        this.originalTextDisplay = document.getElementById('originalTextDisplay');
        this.grammarSection = document.getElementById('grammarSection');
        this.grammarSuggestions = document.getElementById('grammarSuggestions');
        this.improvementsSection = document.getElementById('improvementsSection');
        this.improvementsSuggestions = document.getElementById('improvementsSuggestions');
        this.toneSection = document.getElementById('toneSection');
        this.toneSuggestions = document.getElementById('toneSuggestions');
        this.overallSection = document.getElementById('overallSection');
        this.overallSuggestionText = document.getElementById('overallSuggestionText');
        this.noSuggestions = document.getElementById('noSuggestions');
        
        // Buttons
        this.toggleMonitoringBtn = document.getElementById('toggleMonitoring');
        this.showSettingsBtn = document.getElementById('showSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        this.saveGeminiKeyBtn = document.getElementById('saveGeminiKey');
        this.savePerplexityKeyBtn = document.getElementById('savePerplexityKey');
        this.applyOverallSuggestionBtn = document.getElementById('applyOverallSuggestion');
    }

    setupEventListeners() {
        // Toggle monitoring
        this.toggleMonitoringBtn.addEventListener('click', () => {
            this.toggleMonitoring();
        });

        // Show/hide settings
        this.showSettingsBtn.addEventListener('click', () => {
            this.toggleSettings();
        });

        // Save settings
        this.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Save API keys
        this.saveGeminiKeyBtn.addEventListener('click', () => {
            this.saveApiKey('gemini', this.geminiKey.value);
        });

        this.savePerplexityKeyBtn.addEventListener('click', () => {
            this.saveApiKey('perplexity', this.perplexityKey.value);
        });

        // Apply overall suggestion
        this.applyOverallSuggestionBtn.addEventListener('click', () => {
            this.applyOverallSuggestion();
        });

        // IPC event listeners
        ipcRenderer.on('text-suggestions', (event, data) => {
            this.displaySuggestions(data);
        });

        ipcRenderer.on('show-settings', () => {
            this.showSettings();
        });
    }

    async loadSettings() {
        try {
            this.settings = await ipcRenderer.invoke('get-settings');
            
            // Update UI with loaded settings
            this.aiProvider.value = this.settings.aiProvider || 'gemini';
            this.autoReplace.checked = this.settings.autoReplace || false;
            this.showSuggestions.checked = this.settings.showSuggestions !== false;
            this.grammarCheck.checked = this.settings.grammarCheck !== false;
            this.toneAdjustment.checked = this.settings.toneAdjustment !== false;

            // Load API keys
            const geminiKey = await ipcRenderer.invoke('get-api-key', 'gemini');
            const perplexityKey = await ipcRenderer.invoke('get-api-key', 'perplexity');
            
            if (geminiKey) this.geminiKey.value = '••••••••••••••••';
            if (perplexityKey) this.perplexityKey.value = '••••••••••••••••';
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            const settings = {
                aiProvider: this.aiProvider.value,
                autoReplace: this.autoReplace.checked,
                showSuggestions: this.showSuggestions.checked,
                grammarCheck: this.grammarCheck.checked,
                toneAdjustment: this.toneAdjustment.checked
            };

            const result = await ipcRenderer.invoke('save-settings', settings);
            
            if (result.success) {
                this.settings = settings;
                this.showNotification('Settings saved successfully!', 'success');
            } else {
                this.showNotification('Failed to save settings', 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

    async saveApiKey(service, key) {
        try {
            const result = await ipcRenderer.invoke('save-api-key', { service, key });
            
            if (result.success) {
                this.showNotification(`${service} API key saved successfully!`, 'success');
                // Mask the key in the input
                if (key) {
                    const input = service === 'gemini' ? this.geminiKey : this.perplexityKey;
                    input.value = '••••••••••••••••';
                }
            } else {
                this.showNotification(`Failed to save ${service} API key`, 'error');
            }
        } catch (error) {
            console.error(`Error saving ${service} API key:`, error);
            this.showNotification(`Error saving ${service} API key`, 'error');
        }
    }

    async toggleMonitoring() {
        try {
            this.isMonitoring = await ipcRenderer.invoke('toggle-monitoring');
            this.updateMonitoringStatus();
        } catch (error) {
            console.error('Error toggling monitoring:', error);
            this.showNotification('Error toggling monitoring', 'error');
        }
    }

    updateMonitoringStatus() {
        if (this.isMonitoring) {
            this.statusDot.classList.add('active');
            this.statusText.textContent = 'Monitoring';
            this.toggleMonitoringBtn.textContent = 'Stop Monitoring';
            this.toggleMonitoringBtn.classList.add('active');
        } else {
            this.statusDot.classList.remove('active');
            this.statusText.textContent = 'Stopped';
            this.toggleMonitoringBtn.textContent = 'Start Monitoring';
            this.toggleMonitoringBtn.classList.remove('active');
        }
    }

    toggleSettings() {
        const isSettingsVisible = this.settingsPanel.style.display !== 'none';
        
        if (isSettingsVisible) {
            this.settingsPanel.style.display = 'none';
            this.suggestionsPanel.style.display = 'block';
            this.showSettingsBtn.textContent = 'Settings';
        } else {
            this.settingsPanel.style.display = 'block';
            this.suggestionsPanel.style.display = 'none';
            this.showSettingsBtn.textContent = 'Suggestions';
        }
    }

    showSettings() {
        this.settingsPanel.style.display = 'block';
        this.suggestionsPanel.style.display = 'none';
        this.showSettingsBtn.textContent = 'Suggestions';
    }

    displaySuggestions(data) {
        this.currentSuggestions = data;
        
        // Update original text display
        this.originalTextDisplay.textContent = data.originalText;
        
        // Hide no suggestions message
        this.noSuggestions.style.display = 'none';
        
        // Display grammar issues
        if (data.suggestions.grammarIssues && data.suggestions.grammarIssues.length > 0) {
            this.displayGrammarIssues(data.suggestions.grammarIssues);
        } else {
            this.grammarSection.style.display = 'none';
        }
        
        // Display improvements
        if (data.suggestions.improvements && data.suggestions.improvements.length > 0) {
            this.displayImprovements(data.suggestions.improvements);
        } else {
            this.improvementsSection.style.display = 'none';
        }
        
        // Display tone suggestions
        if (data.suggestions.toneSuggestions && data.suggestions.toneSuggestions.length > 0) {
            this.displayToneSuggestions(data.suggestions.toneSuggestions);
        } else {
            this.toneSection.style.display = 'none';
        }
        
        // Display overall suggestion
        if (data.suggestions.overallSuggestion && data.suggestions.overallSuggestion !== data.originalText) {
            this.displayOverallSuggestion(data.suggestions.overallSuggestion);
        } else {
            this.overallSection.style.display = 'none';
        }
    }

    displayGrammarIssues(issues) {
        this.grammarSection.style.display = 'block';
        this.grammarSuggestions.innerHTML = '';
        
        issues.forEach(issue => {
            const item = this.createSuggestionItem(issue);
            this.grammarSuggestions.appendChild(item);
        });
    }

    displayImprovements(improvements) {
        this.improvementsSection.style.display = 'block';
        this.improvementsSuggestions.innerHTML = '';
        
        improvements.forEach(improvement => {
            const item = this.createSuggestionItem(improvement);
            this.improvementsSuggestions.appendChild(item);
        });
    }

    displayToneSuggestions(suggestions) {
        this.toneSection.style.display = 'block';
        this.toneSuggestions.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = this.createSuggestionItem(suggestion);
            this.toneSuggestions.appendChild(item);
        });
    }

    displayOverallSuggestion(suggestion) {
        this.overallSection.style.display = 'block';
        this.overallSuggestionText.textContent = suggestion;
    }

    createSuggestionItem(item) {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        
        div.innerHTML = `
            <div class="suggestion-content">
                <div class="suggestion-original">Original: "${item.original}"</div>
                <div class="suggestion-suggested">Suggested: "${item.suggested}"</div>
                <div class="suggestion-explanation">${item.explanation}</div>
            </div>
            <div class="suggestion-actions">
                <button class="apply-suggestion-btn" onclick="app.applyIndividualSuggestion('${item.original}', '${item.suggested}')">
                    ✨ Apply This Fix
                </button>
            </div>
        `;
        
        return div;
    }

    async applyIndividualSuggestion(originalText, suggestedText) {
        try {
            // Show loading state
            const button = event.target;
            const originalButtonText = button.textContent;
            button.textContent = 'Copying...';
            button.disabled = true;
            
            const result = await ipcRenderer.invoke('replace-text', {
                originalText: originalText,
                newText: suggestedText
            });
            
            if (result.success) {
                this.showNotification('✨ Fix copied to clipboard! Press Cmd+V to paste.', 'success');
                
                // Show a helpful instruction
                this.showReplacementInstructions(result.originalText, result.newText);
                
                // Update button to show it was applied
                button.textContent = '✅ Copied!';
                setTimeout(() => {
                    button.textContent = originalButtonText;
                    button.disabled = false;
                }, 3000);
            } else {
                this.showNotification(`❌ ${result.message}`, 'error');
                button.textContent = originalButtonText;
                button.disabled = false;
            }
        } catch (error) {
            console.error('Error applying individual suggestion:', error);
            this.showNotification('❌ Error applying suggestion', 'error');
            const button = event.target;
            button.textContent = '✨ Apply This Fix';
            button.disabled = false;
        }
    }

    async applyOverallSuggestion() {
        if (!this.currentSuggestions) return;
        
        try {
            // Show loading state
            const button = document.getElementById('applyOverallSuggestion');
            const originalText = button.textContent;
            button.textContent = 'Copying to clipboard...';
            button.disabled = true;
            
            const result = await ipcRenderer.invoke('replace-text', {
                originalText: this.currentSuggestions.originalText,
                newText: this.currentSuggestions.suggestions.overallSuggestion
            });
            
            if (result.success) {
                this.showNotification('✨ Text copied to clipboard! Press Cmd+V to paste.', 'success');
                
                // Show a helpful instruction
                this.showReplacementInstructions(result.originalText, result.newText);
                
                // Update button to show it was applied
                button.textContent = '✅ Copied! Press Cmd+V';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 3000);
            } else {
                this.showNotification(`❌ ${result.message}`, 'error');
                button.textContent = originalText;
                button.disabled = false;
            }
        } catch (error) {
            console.error('Error replacing text:', error);
            this.showNotification('❌ Error replacing text', 'error');
            const button = document.getElementById('applyOverallSuggestion');
            button.textContent = 'Apply This Suggestion';
            button.disabled = false;
        }
    }

    showReplacementInstructions(originalText, newText) {
        // Create a more detailed instruction panel
        const instructionPanel = document.createElement('div');
        instructionPanel.className = 'replacement-instructions';
        instructionPanel.innerHTML = `
            <div class="instruction-header">
                <h3>📋 Text Replacement Instructions</h3>
                <button class="close-instructions" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="instruction-content">
                <div class="text-comparison">
                    <div class="text-item">
                        <strong>Original:</strong>
                        <div class="text-display original">"${originalText}"</div>
                    </div>
                    <div class="text-item">
                        <strong>Improved:</strong>
                        <div class="text-display improved">"${newText}"</div>
                    </div>
                </div>
                <div class="instruction-steps">
                    <h4>How to replace:</h4>
                    <ol>
                        <li>Go back to your application (Slack, Gmail, etc.)</li>
                        <li>Select the original text you want to replace</li>
                        <li>Press <kbd>Cmd+V</kbd> to paste the improved text</li>
                    </ol>
                </div>
            </div>
        `;
        
        // Style the instruction panel
        instructionPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #3182ce;
            border-radius: 12px;
            padding: 20px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 2000;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // Add styles for the instruction content
        const style = document.createElement('style');
        style.textContent = `
            .replacement-instructions .instruction-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 10px;
            }
            .replacement-instructions .instruction-header h3 {
                margin: 0;
                color: #2d3748;
            }
            .replacement-instructions .close-instructions {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #718096;
            }
            .replacement-instructions .text-comparison {
                margin-bottom: 20px;
            }
            .replacement-instructions .text-item {
                margin-bottom: 15px;
            }
            .replacement-instructions .text-display {
                padding: 10px;
                border-radius: 6px;
                margin-top: 5px;
                font-family: monospace;
                word-wrap: break-word;
            }
            .replacement-instructions .text-display.original {
                background: #fed7d7;
                border-left: 4px solid #e53e3e;
            }
            .replacement-instructions .text-display.improved {
                background: #c6f6d5;
                border-left: 4px solid #38a169;
            }
            .replacement-instructions .instruction-steps h4 {
                margin: 0 0 10px 0;
                color: #2d3748;
            }
            .replacement-instructions .instruction-steps ol {
                margin: 0;
                padding-left: 20px;
            }
            .replacement-instructions .instruction-steps li {
                margin-bottom: 8px;
                color: #4a5568;
            }
            .replacement-instructions kbd {
                background: #f7fafc;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                padding: 2px 6px;
                font-family: monospace;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
        
        // Add to page
        document.body.appendChild(instructionPanel);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (instructionPanel.parentElement) {
                instructionPanel.remove();
            }
        }, 10000);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#38a169',
            error: '#e53e3e',
            info: '#3182ce'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
});




