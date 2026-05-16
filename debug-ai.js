// Simple script to debug AI verification issues
// Run with: node debug-ai.js

const axios = require('axios');

const API_BASE = 'http://localhost:8080';

async function debugAIVerification() {
  try {
    console.log('🔍 Testing AI Verification System...\n');
    
    // Test user credentials
    const TEST_USER = {
      email: 'test@debug.com',
      password: 'password123',
      name: 'Debug User'
    };
    
    // Test post data
    const TEST_POST = {
      description: 'There is a large pothole on Main Street causing damage to vehicles and needs immediate repair.',
      category: 'roads',
      location: 'Main Street, Test City',
      lat: 18.5204,
      lng: 73.8567,
      media: []
    };
    
    // Step 1: Login/Register
    console.log('1️⃣ Logging in...');
    let authToken;
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      authToken = loginResponse.data.token;
      console.log('✅ Login successful');
    } catch (loginError) {
      if (loginError.response?.status === 401) {
        console.log('👤 User not found, registering...');
        const registerResponse = await axios.post(`${API_BASE}/auth/register`, TEST_USER);
        authToken = registerResponse.data.token;
        console.log('✅ Registration successful');
      } else {
        throw loginError;
      }
    }
    
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // Step 2: Create test post
    console.log('\n2️⃣ Creating test post...');
    const createResponse = await axios.post(`${API_BASE}/posts`, TEST_POST, { headers });
    const postId = createResponse.data.id;
    
    console.log(`📝 Post created with ID: ${postId}`);
    console.log(`🤖 Initial AI Verdict: ${createResponse.data.aiVerdict}`);
    
    // Step 3: Monitor post status
    console.log('\n3️⃣ Monitoring AI verification...');
    
    for (let i = 0; i < 30; i++) { // Check for up to 1 minute
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      try {
        // Use debug endpoint to get detailed info
        const debugResponse = await axios.get(`${API_BASE}/posts/debug/${postId}`, { headers });
        const debug = debugResponse.data;
        
        console.log(`⏰ Check ${i + 1}/30 (${debug.timing.timeSinceCreation}):`);
        console.log(`   AI Status: ${debug.aiStatus.verdict}`);
        
        if (debug.aiStatus.score) {
          console.log(`   AI Score: ${debug.aiStatus.score}`);
        }
        
        if (debug.aiStatus.reasons.length > 0) {
          console.log(`   AI Reasons: ${debug.aiStatus.reasons.join(', ')}`);
        }
        
        if (debug.timing.isStuck) {
          console.log(`   ⚠️  POST IS STUCK - AI verification taking too long`);
        }
        
        // Check if processing completed
        if (debug.aiStatus.verdict !== 'pending') {
          console.log(`\n🎉 AI verification completed!`);
          console.log(`   Final Verdict: ${debug.aiStatus.verdict}`);
          console.log(`   Final Score: ${debug.aiStatus.score || 'N/A'}`);
          console.log(`   Final Reasons: ${debug.aiStatus.reasons.join(', ') || 'N/A'}`);
          break;
        }
        
        // If still pending after reasonable time, something might be wrong
        if (i >= 15) { // After 30 seconds
          console.log(`\n⚠️  WARNING: Post still pending after ${debug.timing.timeSinceCreation}`);
          console.log(`   This suggests there might be an issue with AI verification`);
        }
      } catch (error) {
        console.log(`❌ Error checking post status: ${error.response?.data?.error?.message || error.message}`);
      }
    }
    
    console.log('\n🔍 Final check - Getting post details...');
    try {
      const finalResponse = await axios.get(`${API_BASE}/posts/debug/${postId}`, { headers });
      const final = finalResponse.data;
      
      console.log('\n📊 Final Post Status:');
      console.log(`   Post ID: ${final.postId}`);
      console.log(`   Description: ${final.description}`);
      console.log(`   AI Verdict: ${final.aiStatus.verdict}`);
      console.log(`   AI Score: ${final.aiStatus.score || 'Not set'}`);
      console.log(`   AI Reasons: ${final.aiStatus.reasons.join(', ') || 'None'}`);
      console.log(`   Time Since Creation: ${final.timing.timeSinceCreation}`);
      console.log(`   Is Stuck: ${final.timing.isStuck ? 'YES ⚠️' : 'NO ✅'}`);
      console.log(`   Has Media: ${final.debug.hasMedia ? 'YES' : 'NO'}`);
      console.log(`   Category: ${final.debug.category}`);
      console.log(`   Location: ${final.debug.location}`);
      
    } catch (error) {
      console.log('❌ Error getting final status:', error.response?.data || error.message);
    }
    
    console.log('\n💡 How to interpret results:');
    console.log('✅ SUCCESS: AI verdict is "accepted" or "rejected" (not "pending")');
    console.log('⚠️  STUCK: AI verdict is still "pending" after 1+ minutes');
    console.log('❌ ERROR: API calls failed or post not found');
    
    console.log('\n🔍 If your post is getting stuck:');
    console.log('1. Check server logs for detailed AI verification process');
    console.log('2. Verify OpenAI API key is working');
    console.log('3. Check network connectivity');
    console.log('4. Look for JSON parsing errors in logs');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your backend server is running on http://localhost:8080');
    }
    
    if (error.response?.status === 500) {
      console.log('\n💡 Server error - check backend logs for details');
    }
  }
}

// Run the test
console.log('🚀 Starting AI Verification Debug Test\n');
debugAIVerification().then(() => {
  console.log('\n✅ Debug test completed');
}).catch((err) => {
  console.error('\n💥 Debug test crashed:', err);
});