const http = require('http');

const mockSample = {
    id: 'sample-static-v1',
    name: 'Sample Analysis: Semiconductor Physics',
    date: new Date().toLocaleDateString(),
    timestamp: Date.now(),
    status: 'Complete',
    grade: 'Class 12',
    subject: 'Physics',
    analysisData: {
        summary: "This paper focuses on the fundamental transition from classical diodes to integrated logic gates. It emphasizes the 'Mastery of Half-Wave Rectification' as a critical failure point for 40% of students.",
        overallDifficulty: 'Moderate',
        difficultyDistribution: [
            { name: 'Easy', percentage: 40, color: '#10b981' },
            { name: 'Moderate', percentage: 40, color: '#f59e0b' },
            { name: 'Hard', percentage: 20, color: '#ef4444' }
        ],
        bloomsTaxonomy: [
            { name: 'Applying', percentage: 60, color: '#3b82f6' },
            { name: 'Analyzing', percentage: 30, color: '#6366f1' },
            { name: 'Creating', percentage: 10, color: '#8b5cf6' }
        ],
        topicWeightage: [
            { name: 'Logic Gates', marks: 15, color: '#8b5cf6' },
            { name: 'P-N Junction', marks: 10, color: '#3b82f6' },
            { name: 'Transistors', marks: 12, color: '#10b981' }
        ],
        trends: [
            { title: "Digital Shift", description: "Increased focus on Boolean logic over analog circuit theory.", type: "positive" }
        ],
        predictiveTopics: [
            { topic: "Zener Diode as Regulator", probability: 92, reason: "Consistent omission in previous year cycles suggests a correction in the next board cycle." }
        ],
        strategy: ["Master the Truth Tables for NAND/NOR gates.", "Focus on the depletion layer characteristics under reverse bias."],
        questions: [
            {
                id: 'S1',
                text: "Explain the working of a P-N junction diode in forward bias with a suitable diagram.",
                marks: 5,
                difficulty: 'Moderate',
                topic: 'P-N Junction',
                blooms: 'Understanding',
                source: 'Mock Sample Paper',
                solutionSteps: [
                    "Forward Bias Setup ::: Connect the P-side to the positive terminal and N-side to the negative terminal.",
                    "Depletion Layer Shrinkage ::: The external voltage opposes the built-in potential, reducing the depletion width.",
                    "Carrier Diffusion ::: Majority carriers (holes from P, electrons from N) diffuse across the junction."
                ],
                masteryMaterial: {
                    coreConcept: "Forward bias = Reduced Resistance = Majority Carrier Flow",
                    logic: "External field overcomes the barrier potential (0.7V for Silicon).",
                    memoryTrigger: "P to Positive = Push (carriers pushed across junction)"
                }
            }
        ]
    }
};

const data = JSON.stringify(mockSample);

const options = {
    hostname: 'localhost',
    port: 11001,
    path: '/api/scans',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error('Error seeding via API:', error);
});

req.write(data);
req.end();
