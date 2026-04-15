module.exports = {
    name: 'XSS Scanner',
    type: 'xss',
    severity: 'High',
    mode: 'active',
    
    payloads: [
        '<script>alert(1)</script>',
        '"><script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '"><img src=x onerror=alert(1)>'
    ],
    
    async scan(endpoint, mode) {
        for (const [param, value] of Object.entries(endpoint.parameters || {})) {
            for (const payload of this.payloads) {
                const testUrl = endpoint.url.replace(param + '=' + value, param + '=' + encodeURIComponent(payload));
                
                try {
                    const axios = require('axios');
                    const response = await axios.get(testUrl, {
                        validateStatus: () => true
                    });
                    
                    // Check if payload is reflected unencoded
                    if (response.data.includes(payload) && !response.data.includes(encodeURIComponent(payload))) {
                        return {
                            found: true,
                            type: 'Cross-Site Scripting (XSS)',
                            severity: 'High',
                            details: `Reflected XSS detected in parameter: ${param}`,
                            payload: payload,
                            evidence: 'Payload reflected in response',
                            easyToExploit: true,
                            highImpact: false
                        };
                    }
                } catch (error) {
                    // Continue scanning
                }
            }
        }
        
        return { found: false };
    },
    
    async scanForm(form, mode) {
        return { found: false };
    }
};
