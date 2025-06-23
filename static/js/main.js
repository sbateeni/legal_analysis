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

    // Add event listeners for stage analysis buttons
    document.querySelectorAll('.analyze-stage-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const stageIdx = this.getAttribute('data-stage');
            // إظهار رسالة بجانب الزر
            const statusSpan = document.getElementById(`stage-status-${stageIdx}`);
            if (statusSpan) {
                statusSpan.textContent = 'بدأ عملية التحليل...';
                statusSpan.style.color = '#0d6efd';
            }
            analyzeSingleStage(stageIdx);
        });
    });
});

function showError(message) {
    const apiError = document.getElementById('apiError');
    if (apiError) {
        apiError.textContent = message;
        apiError.style.display = 'block';
        apiError.className = 'text-red-500';
    } else {
        console.error('Error element not found:', message);
    }
}

function showSuccess(message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.textContent = message;
        apiStatus.className = 'text-green-500';
    } else {
        console.error('Status element not found:', message);
    }
}

// دالة لاسترجاع المفتاح المحفوظ
function loadSavedApiKey() {
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        // التحقق من صحة المفتاح المحفوظ
        verifySavedApiKey(savedKey);
    }
}

// دالة للتحقق من صحة المفتاح المحفوظ
function verifySavedApiKey(apiKey) {
    fetch('/test_api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apiKey })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showSuccess('تم استرجاع مفتاح API المحفوظ');
            const apiStatus = document.getElementById('apiStatus');
            if (apiStatus) {
                apiStatus.textContent = '✅ مفتاح API صالح';
                apiStatus.className = 'text-green-500';
            }
            // تفعيل زر التحليل
            const analyzeButton = document.getElementById('analyzeButton');
            if (analyzeButton) {
                analyzeButton.disabled = false;
            }
        } else {
            // إذا كان المفتاح غير صالح، قم بحذفه
            localStorage.removeItem('apiKey');
            showError('المفتاح المحفوظ غير صالح');
        }
    })
    .catch(error => {
        console.error('Error verifying saved API key:', error);
        localStorage.removeItem('apiKey');
    });
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    const apiStatus = document.getElementById('apiStatus');
    const apiError = document.getElementById('apiError');
    
    if (!apiKey) {
        showError('الرجاء إدخال مفتاح API');
        return;
    }

    // إظهار حالة التحميل
    if (apiStatus) {
        apiStatus.textContent = 'جاري التحقق من المفتاح...';
        apiStatus.className = 'text-blue-500';
    }

    // إخفاء أي رسائل خطأ سابقة
    if (apiError) {
        apiError.style.display = 'none';
    }

    // إرسال طلب التحقق من المفتاح
    fetch('/test_api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apiKey })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // إذا كان المفتاح صالحاً، قم بحفظه
            return fetch('/set_api_key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ api_key: apiKey })
            });
        } else {
            throw new Error(data.error || 'فشل التحقق من المفتاح');
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // حفظ المفتاح في localStorage
            localStorage.setItem('apiKey', apiKey);
            showSuccess('تم حفظ مفتاح API بنجاح');
            if (apiStatus) {
                apiStatus.textContent = '✅ مفتاح API صالح';
                apiStatus.className = 'text-green-500';
            }
            // تفعيل زر التحليل
            const analyzeButton = document.getElementById('analyzeButton');
            if (analyzeButton) {
                analyzeButton.disabled = false;
            }
        } else {
            throw new Error(data.error || 'فشل حفظ المفتاح');
        }
    })
    .catch(error => {
        showError(error.message || 'حدث خطأ في الاتصال بالخادم');
        if (apiStatus) {
            apiStatus.textContent = '❌ مفتاح API غير صالح';
            apiStatus.className = 'text-red-500';
        }
        // تعطيل زر التحليل
        const analyzeButton = document.getElementById('analyzeButton');
        if (analyzeButton) {
            analyzeButton.disabled = true;
        }
    });
}

function testApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    const apiStatus = document.getElementById('apiStatus');
    const apiError = document.getElementById('apiError');
    
    if (!apiKey) {
        showError('الرجاء إدخال مفتاح API');
        return;
    }

    // إظهار حالة التحميل
    if (apiStatus) {
        apiStatus.textContent = 'جاري التحقق من المفتاح...';
        apiStatus.className = 'text-blue-500';
    }

    // إخفاء أي رسائل خطأ سابقة
    if (apiError) {
        apiError.style.display = 'none';
    }

    // إرسال طلب التحقق من المفتاح
    fetch('/test_api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apiKey })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // حفظ المفتاح في localStorage
            localStorage.setItem('apiKey', apiKey);
            showSuccess('تم التحقق من صحة مفتاح API');
            if (apiStatus) {
                apiStatus.textContent = '✅ مفتاح API صالح';
                apiStatus.className = 'text-green-500';
            }
            // تفعيل زر التحليل
            const analyzeButton = document.getElementById('analyzeButton');
            if (analyzeButton) {
                analyzeButton.disabled = false;
            }
        } else {
            throw new Error(data.error || 'فشل التحقق من المفتاح');
        }
    })
    .catch(error => {
        showError(error.message || 'حدث خطأ في الاتصال بالخادم');
        if (apiStatus) {
            apiStatus.textContent = '❌ مفتاح API غير صالح';
            apiStatus.className = 'text-red-500';
        }
        // تعطيل زر التحليل
        const analyzeButton = document.getElementById('analyzeButton');
        if (analyzeButton) {
            analyzeButton.disabled = true;
        }
    });
}

function analyzeText() {
    const text = document.getElementById('textInput').value;
    if (!text) {
        showError('الرجاء إدخال نص للتحليل');
        return;
    }
    // تعطيل زر التحليل وإظهار حالة التحميل
    analyzeButton.disabled = true;
    analyzeButton.textContent = 'جاري التحليل...';
    if (loadingElement) loadingElement.style.display = 'block';
    // مسح النتائج السابقة من كل مرحلة
    document.querySelectorAll('.stage-content').forEach(el => {
        el.innerHTML = '';
    });
    // إعادة تعيين التقدم
    currentStage = 0;
    updateProgress(0);
    // بدء التحليل التسلسلي
    analyzeNextStageSequential(text, 0);
}

function analyzeNextStageSequential(text, stageIdx) {
    if (stageIdx >= totalStages) {
        if (loadingElement) loadingElement.style.display = 'none';
        analyzeButton.disabled = false;
        analyzeButton.textContent = 'تحليل النص';
        return;
    }
    // جلب مفتاح API
    const apiKey = localStorage.getItem('apiKey') || '';
    fetch('/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        },
        body: JSON.stringify({ text: text, stage: stageIdx })
    })
    .then(response => {
        if (!response.ok) throw new Error('خطأ في الاتصال بالخادم');
        // SSE: نقرأ الاستجابة كسلسلة أحداث
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        function readChunk() {
            return reader.read().then(({ value, done }) => {
                if (done) {
                    updateProgress(stageIdx + 1);
                    // بعد انتهاء هذه المرحلة، ننتقل للمرحلة التالية
                    setTimeout(() => analyzeNextStageSequential(text, stageIdx + 1), 500);
                    return;
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line
                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            updateStageCard(data, stageIdx);
                        } catch (e) {}
                    }
                });
                return readChunk();
            });
        }
        return readChunk();
    })
    .catch(error => {
        showError('حدث خطأ أثناء التحليل: ' + error.message);
        if (loadingElement) loadingElement.style.display = 'none';
        analyzeButton.disabled = false;
        analyzeButton.textContent = 'تحليل النص';
    });
}

function updateStageCard(data, stageIdx) {
    // ابحث عن البطاقة حسب رقم المرحلة
    const card = document.querySelector(`.stage-card[data-stage="${stageIdx}"]`);
    if (!card) return;
    const content = card.querySelector('.stage-content');
    if (!content) return;
    if (data.error) {
        content.innerHTML = `<div class="error-message">${data.error}</div>`;
        return;
    }
    if (data.analysis) {
        content.innerHTML = `
            <div class="stage-result">
                <div class="stage-header">
                    <span class="stage-status ${data.status}">${data.status === 'completed' ? 'مكتمل' : 'خطأ'}</span>
                </div>
                <div class="stage-body">
                    <div class="stage-description">
                        <strong>الوصف:</strong> <span>${data.description}</span>
                    </div>
                    <div class="key-points">
                        <strong>النقاط الرئيسية:</strong>
                        <ul>${(data.key_points || []).map(point => `<li>${point}</li>`).join('')}</ul>
                    </div>
                    <div class="analysis-section">
                        <strong>التحليل:</strong>
                        <div>${data.analysis.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            </div>
        `;
    }
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

// دالة تنسيق المخرجات بشكل أجمل (فقرات ونقاط تلقائياً)
function formatAnalysisText(text) {
    if (!text) return '';
    // تقسيم النص إلى أسطر
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
    let html = '';
    let inList = false;
    lines.forEach(line => {
        // إذا كان السطر يبدأ بنقطة أو رقم
        if (/^[-•\d]/.test(line)) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${line.replace(/^[-•\d.\s]+/, '')}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p>${line}</p>`;
        }
    });
    if (inList) html += '</ul>';
    return html;
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

// دالة لتحليل مرحلة واحدة فقط
async function analyzeSingleStage(stageIdx) {
    const apiKey = localStorage.getItem('apiKey');
    const text = document.getElementById('textInput').value;
    if (!apiKey) {
        showError('يرجى إدخال مفتاح API أولاً');
        return;
    }
    if (!text.trim()) {
        showError('يرجى إدخال النص القانوني أولاً');
        return;
    }
    const resultDiv = document.getElementById(`stage-result-${stageIdx}`);
    const statusSpan = document.getElementById(`stage-status-${stageIdx}`);
    if (resultDiv) {
        resultDiv.innerHTML = '<span class="loading">جاري التحليل...</span>';
    }
    if (statusSpan) {
        statusSpan.textContent = 'بدأ عملية التحليل...';
        statusSpan.style.color = '#0d6efd';
    }
    try {
        const response = await fetch('/analyze_stage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                stage_idx: stageIdx,
                api_key: apiKey
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            resultDiv.innerHTML = `<div class=\"result-card\">${formatAnalysisText(data.result)}</div>`;
            if (statusSpan) {
                statusSpan.textContent = 'تم الانتهاء ✅';
                statusSpan.style.color = '#48bb78';
            }
        } else {
            resultDiv.innerHTML = `<span class=\"text-red-500\">${data.error || 'حدث خطأ أثناء التحليل'}</span>`;
            if (statusSpan) {
                statusSpan.textContent = 'حدث خطأ ❌';
                statusSpan.style.color = '#f56565';
            }
        }
    } catch (err) {
        resultDiv.innerHTML = `<span class=\"text-red-500\">${err.message || 'فشل الاتصال بالخادم'}</span>`;
        if (statusSpan) {
            statusSpan.textContent = 'حدث خطأ ❌';
            statusSpan.style.color = '#f56565';
        }
    }
} 