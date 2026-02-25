
const userId = 'dca5477c-619f-4315-9988-8314470fc933'; // Common test user
const trajectory = 'KCET';

async function test() {
    const url = `http://localhost:9001/api/learning-journey/subjects/${trajectory}?userId=${userId}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
