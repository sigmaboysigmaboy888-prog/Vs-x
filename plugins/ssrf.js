const axios = require('axios');

module.exports = {
    name: 'SSRF Scanner',
    type: 'ssrf',
    severity: 'High',
    mode: 'active',
    
    payloads: [
        'http://169.254.169.254/latest/meta-data/',
        'http://localhost:8080/admin',
        'http://127.0.0.1:22',
        'file:///etc/passwd'
    ],
    
    async scan(endpoint, mode) {
        for (const [param, value] of Object.entries(endpoint.parameters || {})) {
            for (const payload of this.payloads) {
                const testUrl = endpoint.url.replace(param + '=' + value, param + '=' + encodeURIComponent(payload));
                
                try {
                    const response = await axios.get(testUrl, {
                        timeout: 5000,
                        validateStatus: () => true
                    });
                    
                    // Check for SSRF indicators
                    if (response.data.includes('root:') || 
                        response.data.includes('aws-ec2') ||
                        response.data.includes('127.0.0.1')) {
                        return {
                            found: true,
                            type: 'Server-Side Request Forgery (SSRF)',
                            severity: 'High',
                            details: `SSRF detected in parameter: ${param}`,
                            payload: payload,
                            evidence: 'Internal service response received',
                            easyToExploit: false,
                            highImpact: true
                        };
                    }
                } catch (error) {
                    // Continue
                }
            }
        }
        
        return { found: false };
    },
    
    async scanForm(form, mode) {
        return { found: false };
    }
};
