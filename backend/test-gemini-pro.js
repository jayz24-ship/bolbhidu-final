/**
 * Alternative test with gemini-pro model
 * Run: node test-gemini-pro.js
 */

import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

console.log('\n🔍 Testing with gemini-pro model\n');

if (!GEMINI_API_KEY) {
  console.error('❌ No API key found');
  process.exit(1);
}

const testPrompt = `Analyze: "Large pothole on Main Street" - Category: roads. Valid? Respond with JSON: {"isValid":true/false,"score":0-100,"reason":"...","category":"roads"}`;

async function test() {
  try {
    // Try gemini-pro
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: testPrompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
        })
      }
    );

    console.log(`Status: ${response.status}`);

    if (!response.ok) {
      const err = await response.json();
      console.error('Error:', JSON.stringify(err, null, 2));
      process.exit(1);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('✅ Success! Response:', content);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
