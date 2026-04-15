const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { PentestPipeline } = require('./core/pipeline');
const { HTTPInterceptor } = require('./core/interceptor');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

let activeScans = new Map();
let interceptor = new HTTPInterceptor();

// WebSocket Connection
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'start_scan') {
            const scanId = Date.now().toString();
            const pipeline = new PentestPipeline(data.target, data.mode, ws);
            activeScans.set(scanId, pipeline);
            
            try {
                await pipeline.execute();
                ws.send(JSON.stringify({
                    type: 'scan_complete',
                    scanId: scanId,
                    results: pipeline.getResults()
                }));
            } catch (error) {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: error.message
                }));
            } finally {
                activeScans.delete(scanId);
            }
        }
        
        if (data.type === 'intercept_request') {
            const result = await interceptor.intercept(data.request);
            ws.send(JSON.stringify({
                type: 'intercept_result',
                result: result
            }));
        }
    });
});

// API Routes
app.get('/api/status/:scanId', (req, res) => {
    const scan = activeScans.get(req.params.scanId);
    if (scan) {
        res.json({ status: 'running', progress: scan.getProgress() });
    } else {
        res.json({ status: 'completed' });
    }
});

app.post('/api/replay', async (req, res) => {
    const result = await interceptor.replay(req.body.request);
    res.json(result);
});

app.get('/api/plugins', (req, res) => {
    const fs = require('fs');
    const plugins = fs.readdirSync('./plugins').map(f => f.replace('.js', ''));
    res.json({ plugins });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 VulnSight X running on http://localhost:${PORT}`);
});
