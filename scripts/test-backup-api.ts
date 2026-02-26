import axios from 'axios';

async function testApiBackup() {
    const scanId = 'dac6f8c8-46a9-4094-83bc-eaaa0afff451';
    const url = `http://localhost:9001/api/scan-visuals/${scanId}`;

    console.log(`🧪 Testing API Backup at ${url}...`);

    const payload = {
        topicSketches: {
            "Determinants": {
                topic: "Determinants",
                pages: [
                    { title: "Page 1", imageData: "test-data" }
                ]
            }
        }
    };

    try {
        const response = await axios.post(url, payload);
        console.log('✅ Response:', response.data);
    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testApiBackup().catch(console.error);
