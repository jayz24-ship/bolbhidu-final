// Quick test script to verify OpenAI integration
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testAI() {
  console.log('Testing OpenAI API integration...\n');
  
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.error('❌ ERROR: OPENAI_API_KEY not set in .env file');
    process.exit(1);
  }
  
  console.log('✓ API Key found');
  console.log(`  Key starts with: ${OPENAI_API_KEY.substring(0, 20)}...`);
  
  const testPrompt = `You are an AI assistant that verifies community issue reports. Analyze the following issue and determine if it's a legitimate community problem.

Issue Details:
- Description: Large pothole on Main Street causing traffic delays
- Category: roads
- Location: Downtown Main Street

Respond in JSON format:
{
  "isValid": true/false,
  "score": 0-100,
  "reason": "Brief explanation",
  "category": "roads"
}`;

  try {
    console.log('\nSending test request to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that verifies community issue reports. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: testPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ API Error (${response.status}):`, error);
      process.exit(1);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    console.log('✓ API Response received\n');
    console.log('Raw response:', content);
    
    const result = JSON.parse(content);
    console.log('\n✓ Parsed result:');
    console.log('  - Valid:', result.isValid);
    console.log('  - Score:', result.score);
    console.log('  - Reason:', result.reason);
    console.log('  - Category:', result.category);
    
    console.log('\n✅ AI Integration is working correctly!');
    console.log('\nYou can now create posts and they will be verified by AI.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAI();
