const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ScannerEngine {
    constructor(mode, ws) {
        this.mode = mode;
        this.ws = ws;
        this.plugins = this.loadPlugins();
    }
    
    loadPlugins() {
        const plugins = [];
        const pluginsDir = path.join(__dirname, '../plugins');
        if (fs.existsSync(pluginsDir)) {
            const files = fs.readdirSync(pluginsDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const plugin = require(path.join(pluginsDir, file));
                    plugins.push(plugin);
                }
            }
        }
        return plugins;
    }
    
    async scan(surface) {
        const vulnerabilities = [];
        let totalTests = 0;
        let completedTests = 0;
        
        // Pastikan surface memiliki properti yang dibutuhkan
        const endpoints = surface.endpoints || [];
        const forms = surface.forms || [];
        
        // Calculate total tests
        totalTests += endpoints.length * this.plugins.length;
        totalTests += forms.length * this.plugins.length;
        
        for (const endpoint of endpoints) {
            for (const plugin of this.plugins) {
                if (this.shouldRunPlugin(plugin)) {
                    try {
                        const result = await plugin.scan(endpoint, this.mode);
                        if (result && result.found) {
                            vulnerabilities.push({
                                ...result,
                                endpoint: endpoint.url,
                                timestamp: new Date().toISOString()
                            });
                            this.sendLog(`Found ${result.type}: ${result.details}`, 'warning');
                        }
                    } catch (error) {
                        console.error(`Plugin error ${plugin.name}:`, error);
                    }
                    
                    completedTests++;
                    this.updateProgress(completedTests, totalTests);
                }
            }
        }
        
        for (const form of forms) {
            for (const plugin of this.plugins) {
                if (this.shouldRunPlugin(plugin)) {
                    try {
                        const result = await plugin.scanForm(form, this.mode);
                        if (result && result.found) {
                            vulnerabilities.push({
                                ...result,
                                endpoint: form.action,
                                timestamp: new Date().toISOString()
                            });
                            this.sendLog(`Found ${result.type} in form: ${form.action}`, 'warning');
                        }
                    } catch (error) {
                        console.error(`Plugin error ${plugin.name}:`, error);
                    }
                    
                    completedTests++;
                    this.updateProgress(completedTests, totalTests);
                }
            }
        }
        
        return vulnerabilities;
    }
    
    shouldRunPlugin(plugin) {
        if (this.mode === 'Passive') {
            return plugin.mode === 'passive';
        } else if (this.mode === 'Active') {
            return plugin.mode === 'active';
        } else {
            return true; // Aggressive
        }
    }
    
    updateProgress(completed, total) {
        if (total === 0) return;
        const percent = (completed / total) * 100;
        this.sendLog(`Scan progress: ${Math.round(percent)}% (${completed}/${total})`, 'info');
    }
    
    sendLog(message, level) {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                type: 'scan_log',
                level: level,
                message: message
            }));
        }
    }
}

module.exports = { ScannerEngine };
