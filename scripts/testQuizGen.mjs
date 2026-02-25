import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get a real user to test with
const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
if (!users?.length) { console.error('No auth users found'); process.exit(1); }
const user = users[0];
console.log('✅ Using user:', user.email, '(', user.id, ')');

// Create session for this user using admin API
const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    email_confirm: true,
    user_metadata: {}
});

// Alternative: use generateLink approach to get a token
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
});

if (linkData?.properties?.action_link) {
    // Extract the token from the magic link
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get('token') || linkData.properties.hashed_token;
    console.log('🔗 Got magic link token');

    // Use the anon client to sign in with this token
    const supabaseAnon = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
    );
    const { data: signInData, error: signInErr } = await supabaseAnon.auth.verifyOtp({
        email: user.email,
        token: linkData.properties.hashed_token,
        type: 'magiclink'
    });

    if (signInErr || !signInData?.session) {
        console.error('Sign in failed:', signInErr?.message);
        // Try with userId directly in body (check if server has fallback)
        await testDirectly(user.id);
        process.exit(0);
    }

    const accessToken = signInData.session.access_token;
    console.log('✅ Got access token!');
    await testWithToken(accessToken, user.id);
} else {
    console.error('No magic link data');
    await testDirectly(user.id);
}

async function testWithToken(token, userId) {
    console.log('\n📡 Calling /api/tests/generate...');
    const start = Date.now();
    const res = await fetch('http://localhost:9001/api/tests/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            userId,
            testType: 'topic_quiz',
            subject: 'Mathematics',
            examContext: 'KCET',
            topics: ['Determinants'],
            totalQuestions: 5
        })
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const data = await res.json();
    if (!res.ok || data.error) {
        console.error(`❌ Error (${res.status}) in ${elapsed}s:`, data.error, data.message);
        return;
    }
    console.log(`\n✅ SUCCESS in ${elapsed}s!`);
    console.log(`📦 Generated ${data.questions?.length} questions`);
    console.log(`🤖 AI generated: ${data.metadata?.generatedWithAI}`);
    data.questions?.slice(0, 2).forEach((q, i) => {
        console.log(`\nQ${i + 1}: ${q.question?.substring(0, 120)}`);
        if (q.options) q.options.forEach((o, j) => console.log(`  ${j === q.correctIndex ? '✅' : '  '} [${j}] ${o}`));
        console.log(`   Difficulty: ${q.difficulty}`);
    });
}

async function testDirectly(userId) {
    // Test core AI generation without server auth
    console.log('\n🤖 Testing AI generation directly (bypassing server auth)...');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `You are an expert Mathematics teacher for KCET exam.
Generate exactly 5 high-quality MCQ questions on the topic: "Determinants".
Return ONLY a valid JSON array. Each object: { "id": "q1", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "...", "topic": "Determinants", "difficulty": "easy|moderate|hard" }`;

    const start = Date.now();
    const result = await model.generateContent(prompt);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const raw = result.response.text().trim();
    const jsonStr = raw.includes('```json') ? raw.match(/```json\n([\s\S]*?)\n```/)?.[1] || raw : raw;
    const parsed = JSON.parse(jsonStr);

    console.log(`\n✅ Direct AI generation succeeded in ${elapsed}s!`);
    console.log(`📦 Generated ${parsed.length} questions`);
    parsed.slice(0, 2).forEach((q, i) => {
        console.log(`\nQ${i + 1}: ${q.question?.substring(0, 120)}`);
        if (q.options) q.options.forEach((o, j) => console.log(`  ${j === q.correctIndex ? '✅' : '  '} [${j}] ${o}`));
    });
}
