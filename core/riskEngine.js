class RiskEngine {
    constructor() {
        this.severityScores = {
            'Critical': 9.0,
            'High': 7.0,
            'Medium': 5.0,
            'Low': 3.0
        };
    }
    
    scoreVulnerabilities(vulnerabilities) {
        return vulnerabilities.map(vuln => {
            const baseScore = this.severityScores[vuln.severity] || 5.0;
            
            // Adjust based on exploitability
            let exploitability = 1.0;
            if (vuln.easyToExploit) exploitability = 1.5;
            
            // Adjust based on impact
            let impact = 1.0;
            if (vuln.highImpact) impact = 1.5;
            
            const cvssScore = baseScore * exploitability * impact;
            
            return {
                ...vuln,
                cvssScore: Math.min(10, cvssScore.toFixed(1)),
                priority: this.getPriority(cvssScore)
            };
        }).sort((a, b) => b.cvssScore - a.cvssScore);
    }
    
    getPriority(score) {
        if (score >= 7) return 'Immediate';
        if (score >= 4) return 'High';
        if (score >= 2) return 'Medium';
        return 'Low';
    }
}

module.exports = { RiskEngine };
