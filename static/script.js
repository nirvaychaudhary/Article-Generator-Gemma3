class ArticleGenerator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.checkHealth();
        this.currentStreamingRequest = null;
    }

    initializeElements() {
        // Form elements
        this.form = document.getElementById('article-form');
        this.topicInput = document.getElementById('topic');
        this.generateBtn = document.getElementById('generate-btn');
        this.streamBtn = document.getElementById('stream-btn');
        
        // Display elements
        this.articleContent = document.getElementById('article-content');
        this.welcomeState = document.getElementById('welcome-state');
        this.loadingState = document.getElementById('loading-state');
        this.errorState = document.getElementById('error-state');
        this.articleDisplay = document.getElementById('article-display');
        this.articleText = document.getElementById('article-text');
        this.errorMessage = document.getElementById('error-message');
        
        // Control elements
        this.copyBtn = document.getElementById('copy-btn');
        this.clearBtn = document.getElementById('clear-btn');
        
        // Status elements
        this.healthStatus = document.getElementById('health-status');
        
        // Stats elements
        this.wordCount = document.getElementById('word-count');
        this.charCount = document.getElementById('char-count');
        this.paragraphCount = document.getElementById('paragraph-count');
        this.readTime = document.getElementById('read-time');
        
        // Progress bar
        this.progressBar = document.querySelector('#progress-bar > div');
        
        // Length radio buttons
        this.lengthRadios = document.querySelectorAll('input[name="length"]');
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleGenerate(e));
        
        // Stream generation
        this.streamBtn.addEventListener('click', () => this.handleStreamGenerate());
        
        // Control buttons
        this.copyBtn.addEventListener('click', () => this.copyArticle());
        this.clearBtn.addEventListener('click', () => this.clearArticle());
        
        // Length radio button styling
        this.lengthRadios.forEach(radio => {
            radio.addEventListener('change', this.updateRadioStyles.bind(this));
        });
        
        // Auto-resize textarea
        this.topicInput.addEventListener('input', this.autoResizeTextarea.bind(this));
    }

    async checkHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
            
            const response = await fetch('http://127.0.0.1:8000/api/health', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const data = await response.json();
            this.updateHealthStatus(data);
        } catch (error) {
            console.error('Health check error:', error);
            this.updateHealthStatus({ 
                status: 'unhealthy', 
                ollama_connected: false, 
                error: error.name === 'AbortError' ? 'Connection timed out' : 'Connection failed: ' + error.message 
            });
        }
    }

    updateHealthStatus(data) {
        const statusElement = this.healthStatus;
        const dot = statusElement.querySelector('.w-2');
        const text = statusElement.querySelector('span');
        
        // Remove existing classes
        statusElement.className = statusElement.className.replace(/status-\w+/g, '');
        
        if (data.status === 'healthy') {
            statusElement.classList.add('status-healthy');
            text.textContent = `Connected to ${data.model || 'Ollama'}`;
        } else {
            statusElement.classList.add('status-unhealthy');
            text.textContent = data.error || 'Ollama disconnected';
        }
    }

    async handleGenerate(e) {
        e.preventDefault();
        
        if (!this.validateForm()) return;
        
        this.showLoadingState();
        this.setButtonsDisabled(true);
        
        try {
            const formData = this.getFormData();
            const response = await fetch('http://127.0.0.1:8000/api/generate-article', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success && data.article) {
                this.displayArticle(data.article);
                this.showToast('Article generated successfully!', 'success');
            } else {
                this.showError(data.error || 'Failed to generate article');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        } finally {
            this.setButtonsDisabled(false);
        }
    }

    async handleStreamGenerate() {
        if (!this.validateForm()) return;
        
        // Cancel any existing stream
        if (this.currentStreamingRequest) {
            this.currentStreamingRequest.abort();
        }
        
        this.showLoadingState();
        this.setButtonsDisabled(true);
        
        try {
            const formData = this.getFormData();
            this.currentStreamingRequest = new AbortController();
            
            const response = await fetch('http://127.0.0.1:8000/api/generate-article-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
                signal: this.currentStreamingRequest.signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            await this.handleStreamResponse(response);
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.showError('Streaming error: ' + error.message);
            }
        } finally {
            this.setButtonsDisabled(false);
            this.currentStreamingRequest = null;
        }
    }

    async handleStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let articleText = '';
        
        // Show article display immediately for streaming
        this.showArticleDisplay();
        this.articleText.innerHTML = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.error) {
                                this.showError(data.error);
                                return;
                            }
                            
                            if (data.chunk) {
                                articleText += data.chunk;
                                this.updateStreamingDisplay(articleText);
                            }
                            
                            if (data.done) {
                                this.finalizeStreamedArticle(articleText);
                                this.showToast('Article streamed successfully!', 'success');
                                return;
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse streaming data:', line);
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                throw error;
            }
        }
    }

    updateStreamingDisplay(text) {
        const formattedText = this.formatArticleText(text);
        this.articleText.innerHTML = formattedText + '<span class="typing-cursor"></span>';
        this.updateArticleStats(text);
    }

    finalizeStreamedArticle(text) {
        const formattedText = this.formatArticleText(text);
        this.articleText.innerHTML = formattedText;
        this.updateArticleStats(text);
        this.enableArticleControls();
    }

    getFormData() {
        return {
            topic: this.topicInput.value.trim(),
            length: document.querySelector('input[name="length"]:checked').value,
            style: document.getElementById('style').value,
            tone: document.getElementById('tone').value
        };
    }

    validateForm() {
        const topic = this.topicInput.value.trim();
        
        if (!topic) {
            this.showToast('Please enter a topic for your article', 'warning');
            this.topicInput.focus();
            return false;
        }
        
        if (topic.length < 10) {
            this.showToast('Please provide a more detailed topic (at least 10 characters)', 'warning');
            this.topicInput.focus();
            return false;
        }
        
        return true;
    }

    showLoadingState() {
        this.hideAllStates();
        this.loadingState.classList.remove('hidden');
        this.animateProgressBar();
    }

    showWelcomeState() {
        this.hideAllStates();
        this.welcomeState.classList.remove('hidden');
        this.disableArticleControls();
    }

    showError(message) {
        this.hideAllStates();
        this.errorMessage.textContent = message;
        this.errorState.classList.remove('hidden');
        this.showToast(message, 'error');
    }

    showArticleDisplay() {
        this.hideAllStates();
        this.articleDisplay.classList.remove('hidden');
    }

    hideAllStates() {
        this.welcomeState.classList.add('hidden');
        this.loadingState.classList.add('hidden');
        this.errorState.classList.add('hidden');
        this.articleDisplay.classList.add('hidden');
    }

    displayArticle(article) {
        this.showArticleDisplay();
        const formattedText = this.formatArticleText(article);
        this.articleText.innerHTML = formattedText;
        this.updateArticleStats(article);
        this.enableArticleControls();
    }

    formatArticleText(text) {
        // Convert markdown-style formatting to HTML
        let formatted = text
            .replace(/\n\s*\n/g, '</p><p class="article-paragraph">')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>');
        
        // Wrap in paragraph tags if not already wrapped
        if (!formatted.startsWith('<h') && !formatted.startsWith('<p')) {
            formatted = '<p class="article-paragraph">' + formatted + '</p>';
        }
        
        return formatted;
    }

    updateArticleStats(text) {
        const words = text.trim().split(/\s+/).length;
        const chars = text.length;
        const paragraphs = text.split(/\n\s*\n/).length;
        const readTime = Math.ceil(words / 200); // Average reading speed
        
        this.wordCount.textContent = words.toLocaleString();
        this.charCount.textContent = chars.toLocaleString();
        this.paragraphCount.textContent = paragraphs;
        this.readTime.textContent = readTime;
    }

    enableArticleControls() {
        this.copyBtn.classList.remove('opacity-0');
        this.clearBtn.classList.remove('opacity-0');
        this.copyBtn.disabled = false;
        this.clearBtn.disabled = false;
    }

    disableArticleControls() {
        this.copyBtn.classList.add('opacity-0');
        this.clearBtn.classList.add('opacity-0');
        this.copyBtn.disabled = true;
        this.clearBtn.disabled = true;
    }

    async copyArticle() {
        try {
            const text = this.articleText.textContent;
            await navigator.clipboard.writeText(text);
            this.showToast('Article copied to clipboard!', 'success');
        } catch (error) {
            this.showToast('Failed to copy article', 'error');
        }
    }

    clearArticle() {
        if (confirm('Are you sure you want to clear the generated article?')) {
            this.showWelcomeState();
            this.showToast('Article cleared', 'info');
        }
    }

    setButtonsDisabled(disabled) {
        this.generateBtn.disabled = disabled;
        this.streamBtn.disabled = disabled;
        
        if (disabled) {
            this.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Generating...</span>';
            this.streamBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Streaming...</span>';
        } else {
            this.generateBtn.innerHTML = '<i class="fas fa-magic"></i><span>Generate Article</span>';
            this.streamBtn.innerHTML = '<i class="fas fa-stream"></i><span>Stream Generate</span>';
        }
    }

    animateProgressBar() {
        let width = 0;
        const interval = setInterval(() => {
            width += Math.random() * 10;
            if (width >= 90) {
                width = 90;
                clearInterval(interval);
            }
            this.progressBar.style.width = width + '%';
        }, 500);
        
        // Clear progress when done
        setTimeout(() => {
            clearInterval(interval);
            this.progressBar.style.width = '100%';
        }, 10000);
    }

    updateRadioStyles() {
        this.lengthRadios.forEach(radio => {
            const label = radio.closest('label');
            if (radio.checked) {
                label.classList.remove('border-gray-200', 'hover:bg-blue-50');
                label.classList.add('border-blue-500', 'bg-blue-50');
            } else {
                label.classList.remove('border-blue-500', 'bg-blue-50');
                label.classList.add('border-gray-200', 'hover:bg-blue-50');
            }
        });
    }

    autoResizeTextarea() {
        this.topicInput.style.height = 'auto';
        this.topicInput.style.height = this.topicInput.scrollHeight + 'px';
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type} toast-enter`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('toast-enter');
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
}

// Global functions for HTML onclick handlers
function showWelcomeState() {
    if (window.articleGenerator) {
        window.articleGenerator.showWelcomeState();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.articleGenerator = new ArticleGenerator();
});