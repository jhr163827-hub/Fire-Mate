const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');

const checks = [
  ['FIRE settings rollback', /data\.fire=p;if\(!persist\(\)\)\{data\.fire=previousFire;return\}/],
  ['retirement plan rollback', /if\(!persist\(\)\)\{data\.retirement=previousRetirement;return\}/],
  ['budget rollback', /if\(!persist\(\)\)\{data\.budgets=previousBudgets;return\}/],
  ['daily record delete rollback', /if\(!persist\(\)\)\{data\.dailySnapshots=previousDailySnapshots;return\}/],
  ['monthly record rollback', /if\(!persist\(\)\)\{data\.snapshots=previousSnapshots;return\}/],
  ['other asset rollback', /if\(!persist\(\)\)\{a\.items=previousItems;return\}/],
];
let failed = 0;
for (const [name, pattern] of checks) {
  try { assert.match(html, pattern); console.log('PASS', name); }
  catch (error) { failed++; console.error('FAIL', name, error.message); }
}
console.log(checks.length + ' static rollback guards; ' + failed + ' failures.');
console.log('Note: these checks verify source guards, not browser storage-failure behavior.');
process.exitCode = failed ? 1 : 0;
