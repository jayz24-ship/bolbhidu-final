import { verifyIssueWithAI } from './dist/src/services/ai-verification.js';

console.log('Testing AI Validation Improvements\n');

const testCases = [
  {
    description: 'fake postsbs s dfdff',
    category: 'water',
    location: 'Test Location',
    expected: 'rejected'
  },
  {
    description: 'asdf qwer random gibberish',
    category: 'roads',
    location: 'Test Location',
    expected: 'rejected'
  },
  {
    description: 'The road near my house has a big pothole that needs repair',
    category: 'roads',
    location: 'Test Location',
    expected: 'accepted'
  },
  {
    description: 'Water supply has been interrupted for 3 days in our area',
    category: 'water',
    location: 'Test Location',
    expected: 'accepted'
  },
  {
    description: 'test post',
    category: 'other',
    location: 'Test Location',
    expected: 'rejected'
  }
];

async function runTests() {
  for (const testCase of testCases) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Testing: "${testCase.description}"`);
    console.log(`Category: ${testCase.category}`);
    console.log(`Expected: ${testCase.expected}`);
    
    try {
      const result = await verifyIssueWithAI(
        testCase.description,
        testCase.category,
        testCase.location
      );
      
      console.log(`\n✓ Result:`);
      console.log(`  - Valid: ${result.isValid}`);
      console.log(`  - Score: ${result.score}/100`);
      console.log(`  - Reason: ${result.reason}`);
      
      const wouldBeAccepted = result.isValid && result.score >= 60;
      const status = wouldBeAccepted ? 'ACCEPTED' : 'REJECTED';
      const match = (testCase.expected === 'accepted' && wouldBeAccepted) || 
                   (testCase.expected === 'rejected' && !wouldBeAccepted);
      
      console.log(`\n  ➜ Status: ${status} ${match ? '✓ PASS' : '✗ FAIL'}`);
      
    } catch (error) {
      console.log(`\n✗ Error: ${error.message}`);
    }
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('\nTest completed!');
}

runTests().catch(console.error);
