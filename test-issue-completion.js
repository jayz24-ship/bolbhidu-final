// Test script to verify issue completion notifications
// Run with: node test-issue-completion.js

const axios = require('axios');

const API_BASE = 'http://localhost:8080';

async function testIssueCompletionNotification() {
  try {
    console.log('🧪 Testing Issue Completion Notification System...\n');
    
    // Test users
    const POST_AUTHOR = {
      email: 'author@issue-test.com',
      password: 'password123',
      name: 'Issue Reporter'
    };
    
    const ADMIN_USER = {
      email: 'admin@test.com', // You may need to update this
      password: 'admin123',    // You may need to update this  
      name: 'Admin User'
    };
    
    // Step 1: Set up users
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
    
    // Login admin (you may need to create an admin user first)
    let adminToken;
    try {
      const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password
      });
      adminToken = adminLogin.data.token;
      console.log('✅ Admin logged in');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️ Admin user not found. You may need to create an admin user first.');
        console.log('💡 For now, skipping admin actions - check notifications manually via database or admin panel');
        return;
      } else {
        throw error;
      }
    }
    
    const authorHeaders = { Authorization: `Bearer ${authorToken}` };
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    
    // Step 2: Create a post and get it escalated
    console.log('\n2️⃣ Creating post and triggering escalation...');
    const testPost = {
      description: 'Urgent: Broken streetlight on Oak Avenue creating safety hazard for pedestrians at night.',
      category: 'safety',
      location: 'Oak Avenue, Test City',
      lat: 18.5204,
      lng: 73.8567,
      media: []
    };
    
    const createResponse = await axios.post(`${API_BASE}/posts`, testPost, { headers: authorHeaders });
    const postId = createResponse.data.id;
    console.log(`📝 Post created with ID: ${postId}`);
    
    // Create another user to like the post and trigger escalation
    const LIKER = { email: 'liker2@test.com', password: 'password123', name: 'Liker' };
    let likerToken;
    try {
      const likerLogin = await axios.post(`${API_BASE}/auth/login`, LIKER);
      likerToken = likerLogin.data.token;
    } catch (error) {
      const likerRegister = await axios.post(`${API_BASE}/auth/register`, LIKER);
      likerToken = likerRegister.data.token;
    }
    
    // Like the post to trigger escalation (threshold is 1 in your .env)
    await axios.post(`${API_BASE}/posts/${postId}/like`, {}, { 
      headers: { Authorization: `Bearer ${likerToken}` }
    });
    console.log('👍 Post liked to trigger escalation');
    
    // Wait for escalation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check initial notifications
    console.log('\n3️⃣ Checking author notifications before admin actions...');
    const initialNotifications = await axios.get(`${API_BASE}/notifications`, { headers: authorHeaders });
    console.log(`📬 Author has ${initialNotifications.data.unreadCount} unread notifications`);
    console.log(`📋 Total notifications: ${initialNotifications.data.items.length}`);
    
    // Step 4: Get list of issues (find the escalated issue)
    console.log('\n4️⃣ Getting admin issues list...');
    const issuesResponse = await axios.get(`${API_BASE}/admin/issues`, { headers: adminHeaders });
    const issues = issuesResponse.data.issues;
    
    console.log(`📋 Found ${issues.length} issues in admin panel`);
    
    // Find our issue
    const ourIssue = issues.find(issue => issue.postId === postId);
    if (!ourIssue) {
      console.log('⚠️  Could not find escalated issue - escalation might not have triggered');
      return;
    }
    
    console.log(`🎯 Found our issue: ${ourIssue.id} (status: ${ourIssue.status})`);
    
    // Step 5: Admin validates the issue
    if (ourIssue.status === 'Pending') {
      console.log('\n5️⃣ Admin validating issue (starting work)...');
      await axios.post(`${API_BASE}/admin/issues/${ourIssue.id}/validate`, {
        etaDays: 3
      }, { headers: adminHeaders });
      console.log('✅ Issue validated (work started)');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 6: Admin updates progress
    console.log('\n6️⃣ Admin updating progress...');
    await axios.post(`${API_BASE}/admin/issues/${ourIssue.id}/progress`, {
      progressPercent: 50
    }, { headers: adminHeaders });
    console.log('✅ Progress updated to 50%');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 7: Admin completes the issue (MAIN TEST)
    console.log('\n7️⃣ Admin completing the issue...');
    await axios.post(`${API_BASE}/admin/issues/${ourIssue.id}/complete`, {
      afterImages: ['completed-streetlight-image-id']
    }, { headers: adminHeaders });
    console.log('✅ Issue marked as completed');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 8: Check notifications after completion
    console.log('\n8️⃣ Checking author notifications after issue completion...');
    const finalNotifications = await axios.get(`${API_BASE}/notifications`, { headers: authorHeaders });
    
    console.log(`📬 Author now has ${finalNotifications.data.unreadCount} unread notifications`);
    console.log(`📋 Total notifications: ${finalNotifications.data.items.length}`);
    
    // Step 9: Look for completion notification
    const completionNotifications = finalNotifications.data.items.filter(n => 
      n.type === 'issue_completed' && n.data?.issueId === ourIssue.id
    );
    
    console.log('\n📋 Notification Analysis:');
    console.log(`🎉 Issue completion notifications: ${completionNotifications.length}`);
    
    if (completionNotifications.length > 0) {
      const notification = completionNotifications[0];
      console.log('📝 Completion notification details:');
      console.log(`   Title: ${notification.title}`);
      console.log(`   Message: ${notification.message}`);
      console.log(`   Is Read: ${notification.isRead}`);
      console.log(`   Created: ${notification.createdAt}`);
    }
    
    // Step 10: Check unread count endpoint
    console.log('\n🔢 Testing unread count endpoint (for notification bubble):');
    const unreadResponse = await axios.get(`${API_BASE}/notifications/unread-count`, { headers: authorHeaders });
    console.log(`📊 Unread count endpoint returns: ${unreadResponse.data.unreadCount}`);
    
    // Step 11: Verification
    console.log('\n🎯 Verification Results:');
    
    if (completionNotifications.length > 0) {
      console.log('✅ SUCCESS: User received issue completion notification');
      console.log('✅ WORKING: Notification system is functioning correctly');
    } else {
      console.log('❌ ISSUE: No completion notification found');
      console.log('💡 Check server logs for errors in notification creation');
    }
    
    if (finalNotifications.data.unreadCount > initialNotifications.data.unreadCount) {
      console.log('✅ SUCCESS: Unread count increased (notification bubble will show)');
    } else {
      console.log('⚠️  WARNING: Unread count did not increase as expected');
    }
    
    console.log('\n💡 Expected behavior:');
    console.log('1. User creates post → post gets escalated to issue');
    console.log('2. Admin validates issue → user gets "work started" notification');
    console.log('3. Admin updates progress → user gets progress notifications');
    console.log('4. Admin completes issue → user gets "issue resolved" notification');
    console.log('5. Notification bubble shows count of unread notifications');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your backend server is running on http://localhost:8080');
    }
    
    if (error.response?.status === 403) {
      console.log('\n💡 Admin access required. Make sure the admin user has proper role.');
    }
  }
}

// Run the test
console.log('🚀 Starting Issue Completion Notification Test\n');
testIssueCompletionNotification().then(() => {
  console.log('\n✅ Test completed');
}).catch((err) => {
  console.error('\n💥 Test crashed:', err);
});