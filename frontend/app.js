// ==================== STATE MANAGEMENT ====================
let ws = null;
let currentScanId = null;
let vulnerabilities = [];
let riskChart = null;
let scanHistory = [];

// Load scan history from localStorage
function loadHistory() {
    const saved = localStorage.getItem('vulnsight_history');
    if (saved) {
        scanHistory = JSON.parse(saved);
        updateHistoryDisplay();
    }
}

function saveToHistory(scanResult) {
    const historyItem = {
        id: Date.now(),
        target: scanResult.target,
        mode: scanResult.mode,
        timestamp: new Date().toISOString(),
        vulnCount: scanResult.vulnerabilities?.length || 0,
        criticalCount: scanResult.vulnerabilities?.filter(v => v.severity === 'Critical').length || 0
    };
    scanHistory.unshift(historyItem);
    if (scanHistory.length > 20) scanHistory.pop();
    localStorage.setItem('vulnsight_history', JSON.stringify(scanHistory));
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyDiv = document.getElementById('historyList');
    if (!historyDiv) return;
    
    if (scanHistory.length === 0) {
        historyDiv.innerHTML = '<div class="text-center text-cyan-400/40 py-8">No scan history yet</div>';
        return;
    }
    
    historyDiv.innerHTML = scanHistory.map(item => `
        <div class="glass-card p-4 hover:neon-border transition-all">
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-medium text-cyan-300">${item.target}</div>
                    <div class="text-xs text-cyan-400/50 mt-1">${new Date(item.timestamp).toLocaleString()}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm">${item.vulnCount} vulns</div>
                    <div class="text-xs text-red-400">${item.criticalCount} critical</div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateRecentScans() {
    const recentDiv = document.getElementById('recentScans');
    if (!recentDiv) return;
    
    if (scanHistory.length === 0) {
        recentDiv.innerHTML = '<div class="text-center text-cyan-400/40 py-8">No scans yet</div>';
        return;
    }
    
    recentDiv.innerHTML = scanHistory.slice(0, 5).map(item => `
        <div class="flex justify-between items-center py-2 border-b border-cyan-500/20">
            <div>
                <div class="text-sm">${item.target}</div>
                <div class="text-xs text-cyan-400/50">${new Date(item.timestamp).toLocaleDateString()}</div>
            </div>
            <div class="text-xs ${item.criticalCount > 0 ? 'text-red-400' : 'text-green-400'}">
                ${item.vulnCount} findings
            </div>
        </div>
    `).join('');
}

// ==================== WEBSOCKET ====================
function initWebSocket() {
    ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
        console.log('Connected to VulnSight X');
        addLog('Connected to scanning engine', 'success');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('WebSocket connection error', 'error');
    };
}

function handleWebSocketMessage(data) {
    switch(data.type) {
        case 'progress':
            updateProgress(data.progress, data.message);
            break;
        case 'log':
            addLog(data.message, data.level);
            break;
        case 'scan_complete':
            scanComplete(data.results);
            break;
        case 'error':
            addLog(`Error: ${data.error}`, 'error');
            break;
        case 'intercept_result':
            displayResponse(data.result);
            break;
    }
}

// ==================== SCAN FUNCTIONS ====================
function startScan() {
    const target = document.getElementById('targetUrl').value;
    const mode = document.getElementById('scanMode').value;
    
    if (!target) {
        addLog('Please enter a target URL', 'error');
        return;
    }
    
    // Show progress section
    const progressDiv = document.getElementById('scanProgress');
    const resultsDiv = document.getElementById('scanResults');
    if (progressDiv) progressDiv.classList.remove('hidden');
    if (resultsDiv) resultsDiv.classList.add('hidden');
    
    const logsDiv = document.getElementById('scanLogs');
    if (logsDiv) logsDiv.innerHTML = '';
    
    addLog(`Starting ${mode} scan on ${target}`, 'info');
    
    ws.send(JSON.stringify({
        type: 'start_scan',
        target: target,
        mode: mode
    }));
}

function updateProgress(percent, message) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = `${percent}%`;
    addLog(message, 'info');
}

function addLog(message, level) {
    const logsDiv = document.getElementById('scanLogs');
    if (!logsDiv) return;
    
    const logEntry = document.createElement('div');
    const colors = {
        info: 'text-cyan-400',
        warning: 'text-yellow-400',
        error: 'text-red-400',
        success: 'text-green-400',
        progress: 'text-blue-400'
    };
    
    logEntry.className = `${colors[level] || 'text-gray-400'} mb-1 text-xs`;
    logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsDiv.appendChild(logEntry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

function scanComplete(results) {
    vulnerabilities = results.vulnerabilities || [];
    
    // Save to history
    saveToHistory(results);
    updateRecentScans();
    updateDashboard();
    displayResults(vulnerabilities);
    
    const resultsDiv = document.getElementById('scanResults');
    if (resultsDiv) resultsDiv.classList.remove('hidden');
    
    addLog(`Scan completed! Found ${vulnerabilities.length} vulnerabilities`, 'success');
}

function displayResults(vulnerabilities) {
    const tableDiv = document.getElementById('vulnTable');
    if (!tableDiv) return;
    
    if (vulnerabilities.length === 0) {
        tableDiv.innerHTML = '<div class="text-center text-cyan-400/40 py-8">No vulnerabilities found</div>';
        return;
    }
    
    const table = `
        <table class="vuln-table">
            <thead>
                <tr><th>Severity</th><th>Type</th><th>Endpoint</th><th>CVSS</th><th>Details</th></tr>
            </thead>
            <tbody>
                ${vulnerabilities.map(v => `
                    <tr>
                        <td><span class="badge-${v.severity?.toLowerCase()} px-2 py-1 rounded text-xs">${v.severity}</span></td>
                        <td class="text-sm">${v.type}</td>
                        <td class="text-xs text-cyan-400/60">${v.endpoint?.substring(0, 50) || 'N/A'}${v.endpoint?.length > 50 ? '...' : ''}</td>
                        <td class="font-bold neon-text">${v.cvssScore || 'N/A'}</td>
                        <td>
                            <details><summary class="cursor-pointer text-cyan-400">View</summary>
                            <div class="mt-2 text-xs space-y-1">
                                <p><span class="text-cyan-400">Payload:</span> ${v.payload || 'N/A'}</p>
                                <p><span class="text-cyan-400">Evidence:</span> ${v.evidence || 'N/A'}</p>
                                <p><span class="text-cyan-400">Priority:</span> ${v.priority || 'N/A'}</p>
                            </div>
                            </details>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    tableDiv.innerHTML = table;
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    const totalVulns = document.getElementById('totalVulns');
    const criticalVulns = document.getElementById('criticalVulns');
    const highVulns = document.getElementById('highVulns');
    const riskScore = document.getElementById('riskScore');
    
    if (totalVulns) totalVulns.textContent = vulnerabilities.length;
    if (criticalVulns) criticalVulns.textContent = vulnerabilities.filter(v => v.severity === 'Critical').length;
    if (highVulns) highVulns.textContent = vulnerabilities.filter(v => v.severity === 'High').length;
    
    const avgScore = vulnerabilities.reduce((sum, v) => sum + parseFloat(v.cvssScore || 0), 0) / (vulnerabilities.length || 1);
    if (riskScore) riskScore.textContent = avgScore.toFixed(1);
    
    updateRiskGauge(avgScore);
}

function updateRiskGauge(score) {
    const ctx = document.getElementById('riskGauge');
    if (!ctx) return;
    
    const canvas = ctx.getContext('2d');
    if (riskChart) riskChart.destroy();
    
    riskChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Risk Score', 'Safe'],
            datasets: [{
                data: [score, 10 - score],
                backgroundColor: ['#00ffff', '#1a2a4a'],
                borderWidth: 0,
                borderRadius: 10
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

// ==================== INTERCEPTOR ====================
function sendRequest() {
    let headers = {};
    try {
        const headersText = document.getElementById('reqHeaders').value;
        if (headersText) headers = JSON.parse(headersText);
    } catch(e) {
        addLog('Invalid JSON in headers', 'error');
        return;
    }
    
    const request = {
        method: document.getElementById('reqMethod').value,
        url: document.getElementById('reqUrl').value,
        headers: headers,
        body: document.getElementById('reqBody').value
    };
    
    if (!request.url) {
        addLog('Please enter a URL', 'error');
        return;
    }
    
    addLog(`Sending ${request.method} request to ${request.url}`, 'info');
    ws.send(JSON.stringify({
        type: 'intercept_request',
        request: request
    }));
}

function displayResponse(response) {
    const responseDiv = document.getElementById('responseDisplay');
    const contentDiv = document.getElementById('responseContent');
    
    if (!responseDiv || !contentDiv) return;
    
    if (response.success) {
        contentDiv.innerHTML = `
            <div class="flex gap-4 mb-3 text-sm">
                <div><span class="text-cyan-400">Status:</span> ${response.status} ${response.statusText}</div>
                <div><span class="text-cyan-400">Time:</span> ${response.timeMs}ms</div>
                <div><span class="text-cyan-400">Size:</span> ${response.size} bytes</div>
            </div>
            <div class="mt-3">
                <div class="text-cyan-400 mb-2 text-xs uppercase tracking-wide">Response Body</div>
                <pre class="bg-cyan-950/30 p-3 rounded-lg overflow-x-auto text-xs">${escapeHtml(typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2))}</pre>
            </div>
        `;
    } else {
        contentDiv.innerHTML = `<div class="text-red-400">Error: ${response.error}</div>`;
    }
    
    responseDiv.classList.remove('hidden');
}

function clearInterceptorForm() {
    document.getElementById('reqMethod').value = 'GET';
    document.getElementById('reqUrl').value = '';
    document.getElementById('reqHeaders').value = '';
    document.getElementById('reqBody').value = '';
    document.getElementById('responseDisplay').classList.add('hidden');
}

function showHistoryPanel() {
    addLog('History feature - previous requests will appear here', 'info');
    // Implement history display
}

// ==================== REPORT ====================
function downloadReport() {
    const report = generateHTMLReport();
    const blob = new Blob([report], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vulnsight_report_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Report downloaded', 'success');
}

function generateHTMLReport() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>VulnSight X Report</title>
    <style>
        body { font-family: 'Inter', sans-serif; background: #0a0a1a; color: #e2e8f0; padding: 40px; }
        .container { max-width: 1200px; margin: 0 auto; background: rgba(10,20,40,0.8); border: 1px solid rgba(0,255,255,0.3); border-radius: 16px; padding: 30px; }
        h1 { color: #00ffff; text-shadow: 0 0 10px rgba(0,255,255,0.3); }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(0,255,255,0.2); }
        th { color: #00ffff; }
        .critical { color: #ff4444; }
        .high { color: #ff8844; }
        .medium { color: #ffcc44; }
        .low { color: #44ff88; }
    </style>
</head>
<body>
    <div class="container">
        <h1>VulnSight X Security Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <h2>Summary</h2>
        <p>Total Vulnerabilities: ${vulnerabilities.length}</p>
        <h2>Findings</h2>
        <table>
            <thead><tr><th>Severity</th><th>Type</th><th>Endpoint</th><th>CVSS</th></tr></thead>
            <tbody>
                ${vulnerabilities.map(v => `<tr><td class="${v.severity?.toLowerCase()}">${v.severity}</td><td>${v.type}</td><td>${v.endpoint || 'N/A'}</td><td>${v.cvssScore || 'N/A'}</td></tr>`).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
}

// ==================== SETTINGS ====================
function loadSettings() {
    const timeout = localStorage.getItem('vulnsight_timeout');
    const depth = localStorage.getItem('vulnsight_depth');
    const autoSave = localStorage.getItem('vulnsight_autosave');
    
    if (timeout) document.getElementById('timeoutSetting').value = timeout;
    if (depth) document.getElementById('depthSetting').value = depth;
    if (autoSave) document.getElementById('autoSaveSetting').checked = autoSave === 'true';
}

function saveSettings() {
    const timeout = document.getElementById('timeoutSetting').value;
    const depth = document.getElementById('depthSetting').value;
    const autoSave = document.getElementById('autoSaveSetting').checked;
    
    localStorage.setItem('vulnsight_timeout', timeout);
    localStorage.setItem('vulnsight_depth', depth);
    localStorage.setItem('vulnsight_autosave', autoSave);
    
    addLog('Settings saved', 'success');
}

function clearHistory() {
    if (confirm('Clear all scan history?')) {
        scanHistory = [];
        localStorage.removeItem('vulnsight_history');
        updateHistoryDisplay();
        updateRecentScans();
        addLog('History cleared', 'success');
    }
}

function exportAllData() {
    const data = {
        vulnerabilities: vulnerabilities,
        history: scanHistory,
        settings: {
            timeout: localStorage.getItem('vulnsight_timeout'),
            depth: localStorage.getItem('vulnsight_depth'),
            autoSave: localStorage.getItem('vulnsight_autosave')
        },
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vulnsight_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Data exported', 'success');
}

function showSettings() {
    switchPage('settings');
    document.getElementById('dropdownMenu').classList.add('hidden');
}

function showAbout() {
    switchPage('about');
    document.getElementById('dropdownMenu').classList.add('hidden');
}

// ==================== NAVIGATION ====================
function switchPage(pageName) {
    // Hide all pages
    const pages = ['dashboard', 'scanner', 'interceptor', 'history', 'settings', 'about'];
    pages.forEach(page => {
        const el = document.getElementById(`page${page.charAt(0).toUpperCase() + page.slice(1)}`);
        if (el) el.classList.add('hidden');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`page${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`);
    if (targetPage) targetPage.classList.remove('hidden');
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageName) {
            item.classList.add('active');
        }
    });
    
    // Refresh data when switching pages
    if (pageName === 'history') updateHistoryDisplay();
    if (pageName === 'dashboard') updateRecentScans();
}

// ==================== DROPDOWN MENU ====================
function initDropdown() {
    const menuButton = document.getElementById('menuButton');
    const dropdown = document.getElementById('dropdownMenu');
    
    if (menuButton && dropdown) {
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        
        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });
    }
}

// ==================== HELPER FUNCTIONS ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Load saved data
    loadHistory();
    loadSettings();
    updateRecentScans();
    
    // Initialize WebSocket
    initWebSocket();
    
    // Initialize dropdown
    initDropdown();
    
    // Set default page
    switchPage('dashboard');
    
    // Set active nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            if (page) switchPage(page);
        });
    });
    
    // Global functions for HTML buttons
    window.startScan = startScan;
    window.downloadReport = downloadReport;
    window.sendRequest = sendRequest;
    window.clearInterceptorForm = clearInterceptorForm;
    window.showHistoryPanel = showHistoryPanel;
    window.saveSettings = saveSettings;
    window.clearHistory = clearHistory;
    window.exportAllData = exportAllData;
    window.showSettings = showSettings;
    window.showAbout = showAbout;
    window.switchPage = switchPage;
    
    console.log('VulnSight X UI Ready');
});
