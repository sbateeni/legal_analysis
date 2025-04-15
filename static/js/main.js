let currentStage = 0;
let totalStages = 12;
let eventSource = null;
let retryCount = 0;
const maxRetries = 3;

// Get DOM elements
const textInput = document.getElementById('textInput');
const analyzeButton = document.getElementById('analyzeButton');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const resultElement = document.getElementById('result');
const stageCards = document.querySelectorAll('.stage-card');

// API Key Management
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyButton = document.getElementById('saveApiKey');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const legalText = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');

// Initialize stages data
let stagesData = {};
try {
    const stagesScript = document.getElementById('stages-data');
    if (stagesScript) {
        stagesData = JSON.parse(stagesScript.textContent);
    }
} catch (error) {
    console.error('Error parsing stages data:', error);
    stagesData = {};
}

// Load saved API key on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSavedApiKey();
    
    // Add event listeners
    if (analyzeButton) {
        analyzeButton.addEventListener('click', analyzeText);
    }
    
    if (saveApiKeyButton) {
        saveApiKeyButton.addEventListener('click', saveApiKey);
    }
});

// API Key Management
function loadSavedApiKey() {
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey && apiKeyInput) {
        apiKeyInput.value = savedApiKey;
        showApiKeyStatus('تم تحميل مفتاح API بنجاح', 'success');
    }
}

function saveApiKey() {
    if (!apiKeyInput) return;
    
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showApiKeyStatus('الرجاء إدخال مفتاح API', 'error');
        return;
    }
    
    localStorage.setItem('apiKey', apiKey);
    showApiKeyStatus('تم حفظ مفتاح API بنجاح', 'success');
}

function showApiKeyStatus(message, type) {
    if (!apiKeyStatus) return;
    
    apiKeyStatus.textContent = message;
    apiKeyStatus.className = 'api-key-status ' + type;
    
    // Hide status after 3 seconds
    setTimeout(() => {
        apiKeyStatus.textContent = '';
        apiKeyStatus.className = 'api-key-status';
    }, 3000);
}

function getApiKey() {
    return localStorage.getItem('apiKey');
}

function showError(message) {
    if (!errorElement) return;
    
    errorElement.style.display = 'flex';
    errorElement.querySelector('.error-text').textContent = message;
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function updateProgress(currentStage) {
    const totalStages = 12; // Total number of stages
    const progress = (currentStage / totalStages) * 100;
    
    if (progressBar) {
        progressBar.style.setProperty('--progress', `${progress}%`);
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(progress)}%`;
    }
}

async function analyzeText() {
    const apiKey = getApiKey();
    if (!apiKey) {
        showError('الرجاء إدخال مفتاح API أولاً');
        return;
    }

    if (!textInput) {
        showError('لم يتم العثور على حقل إدخال النص');
        return;
    }

    const text = textInput.value.trim();
    if (!text) {
        showError('الرجاء إدخال النص القانوني للتحليل');
        return;
    }

    // Reset progress
    currentStage = 0;
    updateProgress(currentStage);
    
    // Clear previous results
    document.querySelectorAll('.stage-card .result').forEach(el => {
        el.textContent = '';
    });

    // Start analysis
    analyzeNextStage(text, apiKey);
}

async function analyzeNextStage(text, apiKey) {
    if (currentStage >= 12) {
        return;
    }

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({
                text: text,
                stage: currentStage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Update stage card with result
        const stageCard = document.querySelector(`.stage-card[data-stage="${currentStage}"]`);
        if (stageCard) {
            const resultElement = stageCard.querySelector('.stage-result');
            if (resultElement) {
                resultElement.textContent = data.result;
            }
        }

        // Update progress
        currentStage++;
        updateProgress(currentStage);

        // Continue with next stage after a short delay
        setTimeout(() => {
            analyzeNextStage(text, apiKey);
        }, 1000);

    } catch (error) {
        showError('حدث خطأ أثناء التحليل: ' + error.message);
    }
}

// Show error message
function showError(message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Analyze text
analyzeButton.addEventListener('click', async () => {
    if (!checkApiKey()) return;

    const text = textInput.value.trim();
    if (!text) {
        showError('الرجاء إدخال نص قانوني للتحليل');
        return;
    }

    // Reset UI
    currentStage = 0;
    if (errorElement) errorElement.style.display = 'none';
    if (loadingElement) loadingElement.style.display = 'block';
    progressBar.style.setProperty('--progress', '0%');
    progressText.textContent = '0%';
    
    stageCards.forEach(card => {
        const content = card.querySelector('.stage-content');
        if (content) content.innerHTML = '';
    });

    // Start analysis
    await analyzeNextStage(text);
});

// Analyze next stage
async function analyzeNextStage(text) {
    if (currentStage >= totalStages) {
        loadingElement.style.display = 'none';
        return;
    }

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': getApiKey()
            },
            body: JSON.stringify({
                text: text,
                stage: currentStage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    updateStageCard(data);
                }
            }
        }

        // Update progress
        currentStage++;
        updateProgress(currentStage);

        // Add delay before next stage
        if (currentStage < totalStages) {
            setTimeout(() => analyzeNextStage(text), 1000);
        } else {
            loadingElement.style.display = 'none';
        }

    } catch (err) {
        console.error('Error:', err);
        showError('حدث خطأ أثناء التحليل. الرجاء المحاولة مرة أخرى.');
        loadingElement.style.display = 'none';
    }
}

// Update stage card with analysis
function updateStageCard(data) {
    // Find the card with matching stage title
    const stageTitle = data.stage;
    const card = Array.from(stageCards).find(card => 
        card.querySelector('h3').textContent === stageTitle
    );
    
    if (!card) {
        console.error(`Card not found for stage: ${stageTitle}`);
        return;
    }

    const content = card.querySelector('.stage-content');
    content.innerHTML = `
        <div class="stage-result">
            <div class="stage-header">
                <h4>${data.stage}</h4>
                <span class="stage-status ${data.status}">${data.status === 'completed' ? 'مكتمل' : 'خطأ'}</span>
            </div>
            <div class="stage-body">
                <div class="stage-description">
                    <h5>الوصف:</h5>
                    <p>${data.description}</p>
                </div>
                <div class="key-points">
                    <h5>النقاط الرئيسية:</h5>
                    <ul>
                        ${data.key_points.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>
                <div class="analysis-section">
                    <h5>التحليل:</h5>
                    <p>${data.analysis}</p>
                </div>
            </div>
        </div>
    `;
}

// Function to update UI with analysis results
function updateUI(data) {
    if (data.error) {
        resultElement.innerHTML += `
            <div class="error-message">
                <div class="error-icon">❌</div>
                <div class="error-text">${data.error}</div>
            </div>`;
        return;
    }

    if (data.stage) {
        const stageDiv = document.createElement('div');
        stageDiv.className = 'stage-result';
        
        let analysisContent = '';
        if (data.status === 'error') {
            analysisContent = `
                <div class="analysis-error">
                    <div class="error-icon">⚠️</div>
                    <p>${data.analysis}</p>
                </div>`;
        } else {
            analysisContent = `
                <div class="analysis-content">
                    <div class="analysis-text">${formatAnalysisText(data.analysis)}</div>
                </div>`;
        }

        stageDiv.innerHTML = `
            <div class="stage-header">
                <h3>${data.stage}</h3>
                <div class="stage-status ${data.status}">
                    ${data.status === 'completed' ? '✅' : '⏳'}
                </div>
            </div>
            <div class="stage-body">
                <div class="stage-description">
                    <h4>وصف المرحلة:</h4>
                    <p>${data.description}</p>
                </div>
                <div class="key-points">
                    <h4>النقاط الرئيسية:</h4>
                    <ul>
                        ${data.key_points.map(point => `
                            <li>
                                <span class="point-icon">•</span>
                                <span class="point-text">${point}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="analysis-section">
                    <h4>نتيجة التحليل:</h4>
                    ${analysisContent}
                </div>
            </div>
        `;

        resultElement.appendChild(stageDiv);
    }
}

// Function to format analysis text
function formatAnalysisText(text) {
    // Split text into paragraphs
    const paragraphs = text.split('\n').filter(p => p.trim());
    
    // Format each paragraph
    return paragraphs.map(p => {
        // Check if paragraph is a list item
        if (p.trim().startsWith('-') || p.trim().startsWith('•')) {
            return `<li>${p.trim().substring(1).trim()}</li>`;
        }
        // Check if paragraph is a heading
        if (p.trim().endsWith(':')) {
            return `<h5>${p.trim()}</h5>`;
        }
        // Regular paragraph
        return `<p>${p.trim()}</p>`;
    }).join('');
}

// Check if API key exists
function checkApiKey() {
    const apiKey = getApiKey();
    if (!apiKey) {
        showApiKeyStatus('الرجاء إدخال مفتاح API', 'error');
        return false;
    }
    return true;
} 