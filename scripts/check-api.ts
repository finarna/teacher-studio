import { execSync } from 'child_process';

function checkApi() {
    const scanId = '8fe5ed6a-529c-438e-b30b-b0001970c28d';
    const url = `http://localhost:9001/api/scan/${scanId}`;
    console.log(`📡 Fetching ${url}...`);
    try {
        const response = execSync(`curl -s ${url}`).toString();
        const data = JSON.parse(response);
        console.log(`Scan Name: ${data.name}`);
        console.log(`Questions: ${data.analysisData?.questions?.length}`);
        if (data.analysisData?.questions) {
            const q = data.analysisData.questions[0];
            console.log(`Q1 has extractedImages: ${!!q.extractedImages}`);
            if (q.extractedImages) {
                console.log(`Q1 extractedImages count: ${q.extractedImages.length}`);
                if (q.extractedImages.length > 0) {
                    console.log(`Q1 first image sample: ${q.extractedImages[0].substring(0, 50)}...`);
                }
            }
        }
    } catch (err) {
        console.error('Failed to fetch from API:', err.message);
    }
}

checkApi();
