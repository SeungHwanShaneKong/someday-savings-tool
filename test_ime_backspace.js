// Simulate IME backspace behavior on Korean input
const { sanitizeWonText } = require('./src/lib/smart-won.ts');

// Test 1: Normal case - typing '500만' 
console.log("Test 1 - Normal composition:");
console.log("  Input: '500마' (incomplete)", "→", sanitizeWonText('500마'));
console.log("  Input: '500만' (complete)", "→", sanitizeWonText('500만'));

// Test 2: Backspace during composition (produces incomplete hangul)
console.log("\nTest 2 - Backspace mid-composition:");
const testCases = [
  '500마',      // User presses backspace, 만→마
  '500ㅁ',      // Even more incomplete
  '500',        // Fully deleted
  '50',         // Multiple backspaces
  'ㅎ',         // Orphaned partial hangul
  '500ㅂㅂㅈ',  // Multiple simultaneous key presses
];

testCases.forEach(test => {
  console.log(`  Input: '${test}'`, "→", `'${sanitizeWonText(test)}'`);
});

// Test 3: Check if regex handles composed vs decomposed hangul
console.log("\nTest 3 - Edge cases:");
console.log("  Input: '500\u3133' (partial consonant)", "→", sanitizeWonText('500ㄳ'));
console.log("  Input: '\uac1cㅂㅂ' (mixed)", "→", sanitizeWonText('개ㅂㅂ'));

// Test 4: Verify whitelist regex behavior
console.log("\nTest 4 - Regex whitelist check:");
const regex = /[^0-9.억만]/g;
const testStr = '500마ㅁ abc';
console.log(`  Pattern /[^0-9.억만]/g on '${testStr}'`);
console.log(`  Matches:`, testStr.match(regex));
console.log(`  After replace:`, testStr.replace(regex, ''));
