let currentStage = 0;
let totalStages = 0;
let eventSource = null;

// Get DOM elements
const textInput = document.getElementById('textInput');
const analyzeButton = document.getElementById('analyzeButton');
const progressBar = document.getElementById('progress');
const loadingElement = document.getElementById('loading');
const resultElement = document.getElementById('result');

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

function updateProgress() {
    const progress = (currentStage / totalStages) * 100;
    progressBar.style.width = `${progress}%`;
}

// Function to analyze text
async function analyzeText() {
    const text = textInput.value.trim();
    if (!text) {
        alert('الرجاء إدخال نص للتحليل');
        return;
    }

    // Reset UI
    resultElement.innerHTML = '';
    progressBar.style.width = '0%';
    loadingElement.style.display = 'block';
    analyzeButton.disabled = true;

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        updateUI(data);
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        resultElement.innerHTML = `<div class="error">حدث خطأ أثناء التحليل: ${error.message}</div>`;
    } finally {
        loadingElement.style.display = 'none';
        analyzeButton.disabled = false;
    }
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
        const stageIndex = Object.keys(stagesData).indexOf(data.stage);
        const progress = ((stageIndex + 1) / Object.keys(stagesData).length) * 100;
        progressBar.style.width = `${progress}%`;

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