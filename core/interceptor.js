const axios = require('axios');

class HTTPInterceptor {
    constructor() {
        this.history = [];
    }
    
    async intercept(request) {
        const intercepted = {
            original: request,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        
        this.history.push(intercepted);
        return intercepted;
    }
    
    async replay(request) {
        try {
            const startTime = Date.now();
            const response = await axios({
                method: request.method,
                url: request.url,
                headers: request.headers || {},
                data: request.body,
                validateStatus: () => true
            });
            
            const endTime = Date.now();
            
            return {
                success: true,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: response.data,
                timeMs: endTime - startTime,
                size: JSON.stringify(response.data).length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    getHistory() {
        return this.history;
    }
    
    modifyRequest(request, modifications) {
        return {
            ...request,
            ...modifications
        };
    }
}

module.exports = { HTTPInterceptor };
