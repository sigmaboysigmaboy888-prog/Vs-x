const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class SmartCrawler {
    constructor(target, depth = 2) {
        this.target = target;
        this.depth = depth;
        this.visited = new Set();
        this.results = {
            links: [],
            forms: [],
            parameters: [],
            endpoints: []
        };
    }
    
    async crawl() {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        await this.crawlPage(page, this.target, 0);
        
        await browser.close();
        return this.results;
    }
    
    async crawlPage(page, url, currentDepth) {
        if (this.visited.has(url) || currentDepth > this.depth) return;
        
        this.visited.add(url);
        
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            const content = await page.content();
            const $ = cheerio.load(content);
            
            // Extract links
            $('a').each((i, elem) => {
                const href = $(elem).attr('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    const absoluteUrl = new URL(href, url).href;
                    if (absoluteUrl.includes(this.target)) {
                        this.results.links.push(absoluteUrl);
                        this.crawlPage(page, absoluteUrl, currentDepth + 1);
                    }
                }
            });
            
            // Extract forms
            $('form').each((i, form) => {
                const action = $(form).attr('action') || '';
                const method = $(form).attr('method') || 'GET';
                const inputs = [];
                
                $(form).find('input, textarea, select').each((j, input) => {
                    inputs.push({
                        name: $(input).attr('name'),
                        type: $(input).attr('type') || 'text',
                        value: $(input).val() || ''
                    });
                });
                
                this.results.forms.push({
                    action: new URL(action, url).href,
                    method: method.toUpperCase(),
                    inputs: inputs
                });
            });
            
            // Extract URL parameters
            const urlObj = new URL(url);
            if (urlObj.searchParams.toString()) {
                const params = {};
                for (let [key, value] of urlObj.searchParams) {
                    params[key] = value;
                    this.results.parameters.push({
                        name: key,
                        location: 'url',
                        value: value
                    });
                }
                this.results.endpoints.push({
                    url: url,
                    method: 'GET',
                    parameters: params
                });
            }
            
        } catch (error) {
            console.error(`Error crawling ${url}:`, error.message);
        }
    }
}

module.exports = { SmartCrawler };
