module.exports = {
    name: 'Open Redirect Scanner',
    type: 'open_redirect',
    severity: 'Medium',
    mode: 'active',
    
    payloads: [
        '//evil.com',
        'https://evil.com',
        '//google.com@evil.com',
        '//evil.com/%2f%2fexample.com'
    ],
    
    async scan(endpoint, mode) {
        for (const [param, value] of Object.entries(endpoint.parameters || {})) {
            for (const payload of this.payloads) {
                const testUrl = endpoint.url.replace(param + '=' + value, param + '=' + encodeURIComponent(payload));
                
                try {
                    const axios = require('axios');
                    const response = await axios.get(testUrl, {
                        maxRedirects: 0,
                        validateStatus: () => true
                    });
                    
                    // Check for redirect to external domain
                    if (response.status === 302 || response.status === 301) {
                        const location = response.headers.location;
                        if (location && (location.includes('evil.com') || location.startsWith('//evil'))) {
                            return {
                                found: true,
                                type: 'Open Redirect',
                                severity: 'Medium',
                                details: `Open redirect detected in parameter: ${param}`,
                                payload: payload,
                                evidence: `Redirects to: ${location}`,
                                easyToExploit: true,
                                highImpact: false
                            };
                        }
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
