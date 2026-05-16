/**
 * Test script to verify Gemini API key
 * Run: node test-gemini.js
 */

import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

console.log('\n🔍 Gemini API Key Test\n');
console.log('================================');

// Check if key exists
if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: No Gemini API key found!');
  console.log('\nPlease add to .env file:');
  console.log('GEMINI_API_KEY=AIzaSy...');
  process.exit(1);
}

console.log(`✅ API Key found: ${GEMINI_API_KEY.substring(0, 10)}...`);
console.log(`📏 Key length: ${GEMINI_API_KEY.length} characters`);

// Test API call
console.log('\n🚀 Testing API call...\n');

const testPrompt = `You are a content moderator. Analyze this report:

Description: Large pothole on Main Street
Category: roads
Location: City Center

Respond with JSON only:
{
  "isValid": true or false,
  "score": 0-100,
  "reason": "brief explanation",
  "category": "roads"
}`;

async function testGeminiAPI() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: testPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200,
          }
        }),
      }
    );

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('\n❌ API Error:');
      console.error(JSON.stringify(errorData, null, 2));
      
      if (response.status === 400) {
        console.log('\n💡 Common fixes:');
        console.log('  1. Check API key is correct (no extra spaces)');
        console.log('  2. Make sure "Generative Language API" is enabled');
        console.log('  3. Visit: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
      } else if (response.status === 403) {
        console.log('\n💡 API key may not have correct permissions');
        console.log('  Visit: https://aistudio.google.com/app/apikey');
      }
      
      process.exit(1);
    }

    const data = await response.json();
    console.log('\n✅ API call successful!\n');
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (content) {
      console.log('📝 AI Response:');
      console.log(content);
      
      try {
        // Try to parse as JSON
        const jsonMatch = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log('\n✅ Valid JSON response:');
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (e) {
        console.log('\n⚠️ Response is not valid JSON, but API works!');
      }
    }

    console.log('\n✅ Gemini API is working correctly!');
    console.log('You can now use it in your app.\n');
    
  } catch (error) {
    console.error('\n❌ Network/Connection Error:');
    console.error(error.message);
    console.log('\n💡 Possible issues:');
    console.log('  1. Check internet connection');
    console.log('  2. Check firewall/proxy settings');
    console.log('  3. Try again in a few seconds');
    process.exit(1);
  }
}

testGeminiAPI();
