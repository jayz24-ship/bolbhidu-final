/**
 * List available Gemini models
 * Run: node list-models.js
 */

import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ No API key found');
  process.exit(1);
}

console.log('\n🔍 Fetching available models...\n');

async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );

    console.log(`Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', JSON.stringify(error, null, 2));
      
      if (response.status === 403 || response.status === 400) {
        console.log('\n💡 Your API key might not have the Generative Language API enabled.');
        console.log('   Visit: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
        console.log('   Or get a new key: https://aistudio.google.com/app/apikey');
      }
      
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('✅ Available models:\n');
    
    if (data.models && data.models.length > 0) {
      data.models.forEach((model) => {
        if (model.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`📦 ${model.name}`);
          console.log(`   Display: ${model.displayName || 'N/A'}`);
          console.log(`   Methods: ${model.supportedGenerationMethods?.join(', ')}`);
          console.log('');
        }
      });
    } else {
      console.log('⚠️ No models found');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

listModels();
