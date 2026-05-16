// Simple debug script for issue completion notifications
// Run with: node debug-completion.js

const axios = require('axios');

const API_BASE = 'http://localhost:8080';

async function debugIssueCompletion() {
  try {
    console.log('🔍 Debug: Issue Completion Notifications\n');
    
    // You'll need to update these with actual credentials
    const ADMIN_USER = {
      email: 'admin@test.com',  // UPDATE THIS
      password: 'admin123'      // UPDATE THIS
    };
    
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    let adminToken;
    try {
      const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password
      });
      adminToken = adminLogin.data.token;
      console.log('✅ Admin logged in successfully');
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data || error.message);
      console.log('💡 Please update ADMIN_USER credentials or create an admin user');
      return;
    }
    
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    
    // Step 2: Get list of issues
    console.log('\n2️⃣ Getting issues list...');
    const issuesResponse = await axios.get(`${API_BASE}/admin/issues`, { headers: adminHeaders });
    const issues = issuesResponse.data.issues;
    
    console.log(`📋 Found ${issues.length} total issues`);
    
    if (issues.length === 0) {
      console.log('⚠️  No issues found. Create a post, like it to escalate, then try again.');
      return;
    }
    
    // Find an in_progress issue to complete
    const inProgressIssue = issues.find(issue => issue.status === 'In progress');
    const pendingIssue = issues.find(issue => issue.status === 'Pending');
    const testIssue = inProgressIssue || pendingIssue || issues[0];
    
    console.log(`🎯 Using issue: ${testIssue.id}`);
    console.log(`   Status: ${testIssue.status}`);
    console.log(`   Post Description: ${testIssue.postDescription}`);
    console.log(`   User: ${testIssue.userInfo.name} (${testIssue.userInfo.email})`);
    
    // Step 3: If pending, validate it first
    if (testIssue.status === 'Pending') {
      console.log('\n3️⃣ Validating issue first (starting work)...');
      await axios.post(`${API_BASE}/admin/issues/${testIssue.id}/validate`, {
        etaDays: 1
      }, { headers: adminHeaders });
      console.log('✅ Issue validated');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 4: Complete the issue  
    console.log('\n4️⃣ Completing the issue...');
    console.log('🔍 Watch server logs for notification creation details...');
    
    try {
      const completeResponse = await axios.post(`${API_BASE}/admin/issues/${testIssue.id}/complete`, {
        afterImages: ['debug-completion-image-id-' + Date.now()]
      }, { headers: adminHeaders });
      
      console.log('✅ Issue completion API call successful:', completeResponse.data);
    } catch (completeError) {
      console.log('❌ Issue completion failed:', completeError.response?.data || completeError.message);
      return;
    }
    
    // Step 5: Wait and then check what happened
    console.log('\n5️⃣ Waiting for notification processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 6: Try to login as the issue author and check notifications
    console.log('\n6️⃣ Checking if we can verify notification was created...');
    console.log(`👤 Issue author email: ${testIssue.userInfo.email}`);
    
    // This is just informational - you can manually check the user's notifications
    console.log('\n📋 Manual Verification Steps:');
    console.log(`1. Login as: ${testIssue.userInfo.email}`);
    console.log(`2. Check notifications: GET ${API_BASE}/notifications`);
    console.log(`3. Look for type: "issue_completed"`);
    console.log(`4. Check server logs above for notification creation details`);
    
    // Step 7: Check server logs guidance
    console.log('\n🔍 What to look for in server logs:');
    console.log('✅ Should see: "[Admin] Issue XXX completed - sending notification to author YYY"');
    console.log('✅ Should see: "[Admin] Creating completion notification for user YYY"');
    console.log('✅ Should see: "[Notification] 📨 Creating notification: ..."');
    console.log('✅ Should see: "[Notification] ✅ Successfully created issue_completed notification"');
    console.log('✅ Should see: "[Admin] ✅ Completion notification created successfully"');
    
    console.log('\n🧪 Additional Test: Direct notification creation');
    try {
      console.log('Testing notification system with test endpoint...');
      const testResponse = await axios.post(`${API_BASE}/admin/test-notification`, {
        userId: testIssue.userInfo.id
      }, { headers: adminHeaders });
      
      console.log('✅ Test notification API response:', testResponse.data);
      
      // Wait a moment then check if notification appears
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('\n🔍 Now manually check notifications for the user to see if test notification appears');
    } catch (testError) {
      console.log('❌ Test notification failed:', testError.response?.data || testError.message);
    }
    
    console.log('\n❌ If you see errors:');
    console.log('- Check if notification service import is working');
    console.log('- Check if MongoDB connection is working');
    console.log('- Check if notification model/schema is correct');
    console.log('- Verify user ID exists and is valid');
    console.log('- Compare test notification vs issue completion notification logs');
    
  } catch (error) {
    console.error('\n💥 Debug script failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your backend server is running on http://localhost:8080');
    }
  }
}

// Run the debug
console.log('🚀 Starting Issue Completion Debug\n');
debugIssueCompletion().then(() => {
  console.log('\n✅ Debug completed - check server logs for details');
}).catch((err) => {
  console.error('\n💥 Debug crashed:', err);
});