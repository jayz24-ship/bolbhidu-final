// Test script to verify escalation notifications are sent only to post author
// Run with: node test-escalation-notification.js

const axios = require('axios');

const API_BASE = 'http://localhost:8080';

async function testEscalationNotification() {
  try {
    console.log('🧪 Testing Post Escalation Notification System...\n');
    
    // Create two users: post author and a person who will like the post
    const POST_AUTHOR = {
      email: 'author@test.com',
      password: 'password123',
      name: 'Post Author'
    };
    
    const POST_LIKER = {
      email: 'liker@test.com', 
      password: 'password123',
      name: 'Post Liker'
    };
    
    // Step 1: Register/Login both users
    console.log('1️⃣ Setting up test users...');
    
    // Login/register author
    let authorToken;
    try {
      const authorLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: POST_AUTHOR.email,
        password: POST_AUTHOR.password
      });
      authorToken = authorLogin.data.token;
      console.log('✅ Post author logged in');
    } catch (error) {
      if (error.response?.status === 401) {
        const authorRegister = await axios.post(`${API_BASE}/auth/register`, POST_AUTHOR);
        authorToken = authorRegister.data.token;
        console.log('✅ Post author registered');
      } else {
        throw error;
      }
    }
    
    // Login/register liker
    let likerToken;
    try {
      const likerLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: POST_LIKER.email,
        password: POST_LIKER.password
      });
      likerToken = likerLogin.data.token;
      console.log('✅ Post liker logged in');
    } catch (error) {
      if (error.response?.status === 401) {
        const likerRegister = await axios.post(`${API_BASE}/auth/register`, POST_LIKER);
        likerToken = likerRegister.data.token;
        console.log('✅ Post liker registered');
      } else {
        throw error;
      }
    }
    
    const authorHeaders = { Authorization: `Bearer ${authorToken}` };
    const likerHeaders = { Authorization: `Bearer ${likerToken}` };
    
    // Step 2: Create a post by the author
    console.log('\n2️⃣ Creating test post...');
    const testPost = {
      description: 'Major road damage on Highway 1 needs immediate attention from city authorities.',
      category: 'roads',
      location: 'Highway 1, Test City',
      lat: 18.5204,
      lng: 73.8567,
      media: []
    };
    
    const createResponse = await axios.post(`${API_BASE}/posts`, testPost, { headers: authorHeaders });
    const postId = createResponse.data.id;
    console.log(`📝 Post created with ID: ${postId}`);
    
    // Step 3: Check initial notification counts
    console.log('\n3️⃣ Checking initial notification counts...');
    const authorNotifications = await axios.get(`${API_BASE}/notifications`, { headers: authorHeaders });
    const likerNotifications = await axios.get(`${API_BASE}/notifications`, { headers: likerHeaders });
    
    const initialAuthorCount = authorNotifications.data.items.length;
    const initialLikerCount = likerNotifications.data.items.length;
    
    console.log(`📬 Author has ${initialAuthorCount} notifications`);
    console.log(`📬 Liker has ${initialLikerCount} notifications`);
    
    // Step 4: Generate enough engagement to trigger escalation
    // Note: Default escalation threshold is 1 (from your .env), so 1 like should trigger it
    console.log('\n4️⃣ Generating engagement to trigger escalation...');
    console.log('👍 Liking the post to trigger escalation...');
    
    await axios.post(`${API_BASE}/posts/${postId}/like`, {}, { headers: likerHeaders });
    console.log('✅ Post liked successfully');
    
    // Wait a moment for escalation to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Check if escalation occurred
    console.log('\n5️⃣ Checking if escalation occurred...');
    const debugResponse = await axios.get(`${API_BASE}/posts/debug/${postId}`, { headers: authorHeaders });
    const postDebug = debugResponse.data;
    
    if (postDebug.debug) {
      console.log(`📊 Post engagement: ${postDebug.debug.likes || 0} likes`);
    }
    
    // Step 6: Check notifications after escalation
    console.log('\n6️⃣ Checking notifications after escalation...');
    
    // Wait a bit more for notification processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalAuthorNotifications = await axios.get(`${API_BASE}/notifications`, { headers: authorHeaders });
    const finalLikerNotifications = await axios.get(`${API_BASE}/notifications`, { headers: likerHeaders });
    
    const finalAuthorCount = finalAuthorNotifications.data.items.length;
    const finalLikerCount = finalLikerNotifications.data.items.length;
    
    console.log(`📬 Author now has ${finalAuthorCount} notifications (+${finalAuthorCount - initialAuthorCount})`);
    console.log(`📬 Liker now has ${finalLikerCount} notifications (+${finalLikerCount - initialLikerCount})`);
    
    // Step 7: Check for escalation notification specifically
    const escalationNotifications = finalAuthorNotifications.data.items.filter(n => 
      n.type === 'post_escalated' && 
      n.data?.postId === postId
    );
    
    const likerEscalationNotifications = finalLikerNotifications.data.items.filter(n => 
      n.type === 'post_escalated' && 
      n.data?.postId === postId
    );
    
    console.log('\n📋 Results:');
    console.log(`🔥 Author received ${escalationNotifications.length} escalation notification(s)`);
    console.log(`❌ Liker received ${likerEscalationNotifications.length} escalation notification(s)`);
    
    if (escalationNotifications.length > 0) {
      console.log('📝 Author escalation notification:', escalationNotifications[0].message);
    }
    
    // Step 8: Verification
    console.log('\n🎯 Verification:');
    
    if (escalationNotifications.length === 1 && likerEscalationNotifications.length === 0) {
      console.log('✅ SUCCESS: Escalation notification sent ONLY to post author');
      console.log('✅ CORRECT: Liker did NOT receive escalation notification');
    } else if (escalationNotifications.length === 0) {
      console.log('⚠️  WARNING: No escalation notification found - post might not have escalated');
      console.log('💡 Check if escalation threshold was reached or if there were errors');
    } else if (likerEscalationNotifications.length > 0) {
      console.log('❌ ISSUE: Liker incorrectly received escalation notification');
      console.log('💡 This should be fixed - only post author should get escalation notifications');
    } else {
      console.log('✅ SUCCESS: Notification system working correctly');
    }
    
    console.log('\n💡 What should happen:');
    console.log('1. Only the POST AUTHOR should receive escalation notification');
    console.log('2. The person who liked/commented should NOT receive escalation notification');
    console.log('3. The escalation notification should be about THEIR OWN POST being escalated');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your backend server is running on http://localhost:8080');
    }
  }
}

// Run the test
console.log('🚀 Starting Escalation Notification Test\n');
testEscalationNotification().then(() => {
  console.log('\n✅ Test completed');
}).catch((err) => {
  console.error('\n💥 Test crashed:', err);
});