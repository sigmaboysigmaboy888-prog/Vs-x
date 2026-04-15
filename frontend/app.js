// State Management
let ws = null;
let currentScanId = null;
let vulnerabilities = [];
let riskChart = null;

// Initialize WebSocket
function initWebSocket() {
    ws = new WebSocket('ws://localhost:3000');
    ws.onopen = () => { addLog('Connected to scanning engine', 'success'); };
    ws.onmessage = (event) => { handleWebSocketMessage(JSON.parse(event.data)); };
    ws.onerror = (error) => { console.error('WebSocket error:', error); addLog('WebSocket connection error', 'error'); };
}

function handleWebSocketMessage(data) {
    switch(data.type) {
        case 'progress': updateProgress(data.progress, data.message); break;
        case 'log': addLog(data.message, data.level); break;
        case 'scan_complete': scanComplete(data.results); break;
        case 'error': addLog(`Error: ${data.error}`, 'error'); break;
        case 'intercept_result': displayResponse(data.result); break;
    }
}

function startScan() {
    const target = document.getElementById('targetUrl').value;
    const mode = document.getElementById('scanMode').value;
    if (!target) { alert('Please enter a target URL'); return; }
    document.getElementById('scanProgress').classList.remove('hidden');
    document.getElementById('scanResults').classList.add('hidden');
    document.getElementById('scanLogs').innerHTML = '';
    ws.send(JSON.stringify({ type: 'start_scan', target: target, mode: mode }));
}

function updateProgress(percent, message) {
    document.getElementById('progressBar').style.width = `${percent}%`;
    addLog(message, 'info');
}

function addLog(message, level) {
    const logsDiv = document.getElementById('scanLogs');
    const logEntry = document.createElement('div');
    const colors = { info: 'text-blue-400', warning: 'text-yellow-400', error: 'text-red-400', success: 'text-green-400' };
    logEntry.className = `${colors[level] || 'text-gray-400'} mb-1`;
    logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsDiv.appendChild(logEntry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

function scanComplete(results) {
    vulnerabilities = results.vulnerabilities || [];
    updateDashboard();
    displayResults(vulnerabilities);
    document.getElementById('scanResults').classList.remove('hidden');
    addLog(`Scan completed! Found ${vulnerabilities.length} vulnerabilities`, 'success');
}

function displayResults(vulnerabilities) {
    const tableDiv = document.getElementById('vulnTable');
    if (vulnerabilities.length === 0) {
        tableDiv.innerHTML = '<div class="text-center text-gray-400 py-8">No vulnerabilities found</div>';
        return;
    }
    const table = `
        <table class="w-full">
            <thead class="bg-gray-800"><tr><th class="px-4 py-2 text-left">Severity</th><th class="px-4 py-2 text-left">Type</th><th class="px-4 py-2 text-left">Endpoint</th><th class="px-4 py-2 text-left">CVSS Score</th><th class="px-4 py-2 text-left">Details</th></tr></thead>
            <tbody>
                ${vulnerabilities.map(v => `
                    <tr class="border-b border-gray-700 hover:bg-gray-800">
                        <td class="px-4 py-2"><span class="px-2 py-1 rounded text-xs font-semibold vuln-${v.severity.toLowerCase()}">${v.severity}</span></td>
                        <td class="px-4 py-2">${v.type}</td>
                        <td class="px-4 py-2 text-sm">${v.endpoint || 'N/A'}</td>
                        <td class="px-4 py-2 font-bold">${v.cvssScore || 'N/A'}</td>
                        <td class="px-4 py-2 text-sm"><details><summary class="cursor-pointer">View Details</summary><div class="mt-2 text-xs"><p><strong>Payload:</strong> ${v.payload || 'N/A'}</p><p><strong>Evidence:</strong> ${v.evidence || 'N/A'}</p><p><strong>Priority:</strong> ${v.priority || 'N/A'}</p></div></details></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    tableDiv.innerHTML = table;
}

function updateDashboard() {
    document.getElementById('totalVulns').textContent = vulnerabilities.length;
    document.getElementById('criticalVulns').textContent = vulnerabilities.filter(v => v.severity === 'Critical').length;
    document.getElementById('highVulns').textContent = vulnerabilities.filter(v => v.severity === 'High').length;
    const avgScore = vulnerabilities.reduce((sum, v) => sum + parseFloat(v.cvssScore || 0), 0) / (vulnerabilities.length || 1);
    document.getElementById('riskScore').textContent = avgScore.toFixed(1);
    updateRiskGauge(avgScore);
}

function updateRiskGauge(score) {
    const ctx = document.getElementById('riskGauge').getContext('2d');
    if (riskChart) riskChart.destroy();
    riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Risk Score', 'Remaining'], datasets: [{ data: [score, 10 - score], backgroundColor: ['#ef4444', '#374151'], borderWidth: 0 }] },
        options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
}

function sendRequest() {
    let headers = {};
    try { headers = JSON.parse(document.getElementById('reqHeaders').value || '{}'); } catch(e) { headers = {}; }
    const request = {
        method: document.getElementById('reqMethod').value,
        url: document.getElementById('reqUrl').value,
        headers: headers,
        body: document.getElementById('reqBody').value
    };
    ws.send(JSON.stringify({ type: 'intercept_request', request: request }));
}

function displayResponse(response) {
    const responseDiv = document.getElementById('responseDisplay');
    const contentDiv = document.getElementById('responseContent');
    if (response.success) {
        contentDiv.innerHTML = `<div class="mb-2"><span class="font-bold">Status:</span> ${response.status} ${response.statusText}</div><div class="mb-2"><span class="font-bold">Time:</span> ${response.timeMs}ms</div><div class="mb-2"><span class="font-bold">Size:</span> ${response.size} bytes</div><div class="mt-4"><span class="font-bold">Response Body:</span><pre class="mt-2 p-2 bg-gray-900 rounded overflow-x-auto">${escapeHtml(JSON.stringify(response.body, null, 2))}</pre></div>`;
    } else {
        contentDiv.innerHTML = `<div class="text-red-400">Error: ${response.error}</div>`;
    }
    responseDiv.classList.remove('hidden');
}

function downloadReport() {
    const report = generateHTMLReport();
    const blob = new Blob([report], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vulnsight_report_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

function generateHTMLReport() {
    return `<!DOCTYPE html><html><head><title>VulnSight X Report</title><style>body{font-family:Arial;margin:40px;background:#f5f5f5}.container{max-width:1200px;margin:0 auto;background:white;padding:30px;border-radius:10px}h1{color:#333}.vuln{margin:20px 0;padding:15px;border-left:4px solid;border-radius:4px}.critical{border-color:#ef4444;background:#fee}.high{border-color:#f59e0b;background:#fff3e0}.medium{border-color:#eab308;background:#fef9e3}.low{border-color:#10b981;background:#e0f2e9}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd}</style></head><body><div class="container"><h1>VulnSight X Security Assessment Report</h1><p>Generated: ${new Date().toLocaleString()}</p><h2>Executive Summary</h2><p>Total Vulnerabilities Found: ${vulnerabilities.length}</p><h2>Vulnerability Details</h2><table><thead><tr><th>Severity</th><th>Type</th><th>Endpoint</th><th>CVSS Score</th></tr></thead><tbody>${vulnerabilities.map(v => `<tr><td>${v.severity}</td><td>${v.type}</td><td>${v.endpoint || 'N/A'}</td><td>${v.cvssScore || 'N/A'}</td></tr>`).join('')}</tbody></table><h2>Remediation Recommendations</h2><ul>${vulnerabilities.map(v => `<li>${v.type}: Implement proper input validation and output encoding</li>`).join('')}</ul></div></body></html>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Navigation
function showDashboard() { toggleViews('dashboardView'); }
function showScanner() { toggleViews('scannerView'); }
function showInterceptor() { toggleViews('interceptorView'); }
function showResults() { toggleViews('scannerView'); } // or any view
function showRequestEditor() { document.getElementById('responseDisplay').classList.add('hidden'); }
function showHistory() { alert('History feature coming soon'); }

function toggleViews(viewId) {
    ['dashboardView', 'scannerView', 'interceptorView'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    showDashboard();
});
