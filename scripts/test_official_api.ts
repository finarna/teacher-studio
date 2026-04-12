import fetch from 'node-fetch';

async function testOfficialAPI() {
  const url = 'http://localhost:3009/api/tests/official?subject=Mathematics&examContext=KCET';

  console.log(`Testing: ${url}\n`);

  const response = await fetch(url);
  const result = await response.json();

  console.log(`Status: ${response.status}`);
  console.log(`Success: ${result.success}`);
  console.log(`Count: ${result.data?.length || 0}\n`);

  result.data?.forEach((test: any, i: number) => {
    console.log(`${i + 1}. ${test.test_name || test.testName}`);
    console.log(`   ID: ${test.id}`);
    console.log(`   Subject: ${test.subject}`);
    console.log(`   official_set_id: ${test.official_set_id}`);
    console.log(`   is_virtual: ${test.is_virtual}`);
    console.log('');
  });
}

testOfficialAPI().then(() => process.exit(0));
