const { SmartCrawler } = require('./crawler');
const { AttackSurfaceMapper } = require('./mapper');
const { ScannerEngine } = require('./scanner');
const { RiskEngine } = require('./riskEngine');
const fs = require('fs');

class PentestPipeline {
    constructor(target, mode, ws) {
        this.target = target;
        this.mode = mode; // Passive, Active, Aggressive
        this.ws = ws;
        this.results = {
            recon: null,
            surface: null,
            vulnerabilities: [],
            report: null
        };
        this.progress = 0;
    }
    
    async execute() {
        try {
            // Phase 1: Recon
            this.updateProgress(10, 'Starting reconnaissance...');
            const recon = await this.runRecon();
            this.results.recon = recon;
            
            // Phase 2: Crawl
            this.updateProgress(25, 'Crawling target...');
            const crawler = new SmartCrawler(this.target, 3);
            const crawlResults = await crawler.crawl();
            
            // Phase 3: Map Attack Surface
            this.updateProgress(40, 'Mapping attack surface...');
            const mapper = new AttackSurfaceMapper();
            this.results.surface = await mapper.map(crawlResults);
            
            // Phase 4: Scan
            this.updateProgress(60, 'Scanning for vulnerabilities...');
            const scanner = new ScannerEngine(this.mode, this.ws);
            this.results.vulnerabilities = await scanner.scan(this.results.surface);
            
            // Phase 5: Analyze & Risk Scoring
            this.updateProgress(85, 'Analyzing risks...');
            const riskEngine = new RiskEngine();
            this.results.vulnerabilities = riskEngine.scoreVulnerabilities(this.results.vulnerabilities);
            
            // Phase 6: Generate Report
            this.updateProgress(95, 'Generating report...');
            this.results.report = this.generateReport();
            
            this.updateProgress(100, 'Scan completed!');
            
            // Save results
            fs.writeFileSync(`scan_${Date.now()}.json`, JSON.stringify(this.results, null, 2));
            
        } catch (error) {
            this.sendLog(`Error: ${error.message}`, 'error');
            throw error;
        }
    }
    
    async runRecon() {
        const axios = require('axios');
        const subdomains = ['www', 'api', 'admin', 'test', 'dev', 'staging'];
        const discovered = [];
        
        for (const sub of subdomains) {
            try {
                const url = `http://${sub}.${this.target.replace('http://', '').replace('https://', '')}`;
                await axios.get(url, { timeout: 3000 });
                discovered.push(url);
                this.sendLog(`Discovered: ${url}`, 'info');
            } catch (e) {}
        }
        
        // Detect technology
        let tech = [];
        try {
            const response = await axios.get(this.target);
            const headers = response.headers;
            if (headers['x-powered-by']) tech.push(headers['x-powered-by']);
            if (headers['server']) tech.push(headers['server']);
        } catch (e) {}
        
        return { subdomains: discovered, technology: tech };
    }
    
    updateProgress(percent, message) {
        this.progress = percent;
        this.sendLog(message, 'progress');
        if (this.ws) {
            this.ws.send(JSON.stringify({
                type: 'progress',
                progress: percent,
                message: message
            }));
        }
    }
    
    sendLog(message, level = 'info') {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                type: 'log',
                level: level,
                message: message,
                timestamp: new Date().toISOString()
            }));
        }
    }
    
    generateReport() {
        const vulnStats = {
            critical: this.results.vulnerabilities.filter(v => v.severity === 'Critical').length,
            high: this.results.vulnerabilities.filter(v => v.severity === 'High').length,
            medium: this.results.vulnerabilities.filter(v => v.severity === 'Medium').length,
            low: this.results.vulnerabilities.filter(v => v.severity === 'Low').length
        };
        
        return {
            timestamp: new Date().toISOString(),
            target: this.target,
            mode: this.mode,
            statistics: vulnStats,
            vulnerabilities: this.results.vulnerabilities,
            recommendations: this.generateRecommendations()
        };
    }
    
    generateRecommendations() {
        const recs = [];
        if (this.results.vulnerabilities.some(v => v.type === 'SQL Injection')) {
            recs.push('Implement parameterized queries and input validation');
        }
        if (this.results.vulnerabilities.some(v => v.type === 'XSS')) {
            recs.push('Implement CSP headers and output encoding');
        }
        return recs;
    }
    
    getResults() {
        return this.results;
    }
    
    // ✅ METHOD INI DITAMBAHKAN (dipanggil oleh server.js)
    getProgress() {
        return this.progress;
    }
}

module.exports = { PentestPipeline };
