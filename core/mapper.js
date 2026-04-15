class AttackSurfaceMapper {
    async map(crawlResults) {
        const surface = {
            endpoints: [],
            forms: [],
            parameters: new Map(),
            methods: new Set()
        };
        
        // Map endpoints
        for (const link of crawlResults.links || []) {
            surface.endpoints.push({
                url: link,
                method: 'GET',
                parameters: this.extractParams(link)
            });
        }
        
        // Map forms
        for (const form of crawlResults.forms || []) {
            surface.forms.push(form);
            surface.methods.add(form.method);
            
            for (const input of form.inputs) {
                if (!surface.parameters.has(input.name)) {
                    surface.parameters.set(input.name, []);
                }
                surface.parameters.get(input.name).push({
                    location: form.action,
                    type: input.type
                });
            }
        }
        
        // Map URL parameters
        for (const param of crawlResults.parameters || []) {
            if (!surface.parameters.has(param.name)) {
                surface.parameters.set(param.name, []);
            }
            surface.parameters.get(param.name).push({
                location: 'url',
                value: param.value
            });
        }
        
        return {
            endpoints: surface.endpoints,
            forms: surface.forms,
            parameters: Array.from(surface.parameters.entries()).map(([name, locations]) => ({ name, locations })),
            methods: Array.from(surface.methods)
        };
    }
    
    extractParams(url) {
        try {
            const urlObj = new URL(url);
            const params = {};
            for (let [key, value] of urlObj.searchParams) {
                params[key] = value;
            }
            return params;
        } catch (e) {
            return {};
        }
    }
}

module.exports = { AttackSurfaceMapper };
