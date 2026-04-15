const axios = require('axios');

module.exports = {
    name: 'Security Headers Scanner',
    type: 'security_headers',
    severity: 'Low',
    mode: 'passive',
    
    requiredHeaders: [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Content-Security-Policy',
        'Strict-Transport-Security'
    ],
    
    async scan(endpoint, mode) {
        try {
            const response = await axios.get(endpoint.url, {
                validateStatus: () => true
            });
            
            const missingHeaders = [];
            for (const header of this.requiredHeaders) {
                if (!response.headers[header.toLowerCase()]) {
                    missingHeaders.push(header);
                }
            }
            
            if (missingHeaders.length > 0) {
                return {
                    found: true,
                    type: 'Missing Security Headers',
                    severity: 'Low',
                    details: `Missing security headers: ${missingHeaders.join(', ')}`,
                    payload: null,
                    evidence: 'HTTP headers analysis',
                    easyToExploit: false,
                    highImpact: false
                };
            }
        } catch (error) {
            // Continue
        }
        
        return { found: false };
    },
    
    async scanForm(form, mode) {
        return { found: false };
    }
};
