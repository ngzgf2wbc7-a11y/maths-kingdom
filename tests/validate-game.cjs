const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('../index.html', 'file://' + __filename), 'utf8');

function declaration(name, nextName) {
  const start = html.indexOf('const ' + name);
  assert.notEqual(start, -1, name + ' declaration exists');
  const end = nextName ? html.indexOf('const ' + nextName, start + 1) : html.indexOf(';', start);
  assert.notEqual(end, -1, name + ' declaration ends');
  const source = html.slice(start, end).replace(/^const\s+\w+\s*=\s*/, '').trim().replace(/;$/, '');
  return vm.runInNewContext('(' + source + ')');
}

const topics = declaration('topics', 'banks');
const banks = declaration('banks', 'quizBanks');
const quizBanks = declaration('quizBanks', ''); 

test('Grade 7 has ten named lands and two five-question stages per land', () => {
  assert.equal(topics.length, 10);
  assert.equal(banks.length, 10);
  assert.equal(quizBanks.length, 10);
  for (let i = 0; i < 10; i++) {
    assert.equal(banks[i].length, 5, 'learning questions for ' + topics[i]);
    assert.equal(quizBanks[i].length, 5, 'final quiz questions for ' + topics[i]);
  }
});

test('every question has four options and a valid answer index', () => {
  for (const bank of [...banks, ...quizBanks]) {
    for (const [question, options, answer] of bank) {
      assert.equal(typeof question, 'string');
      assert.equal(options.length, 4, question);
      assert.ok(Number.isInteger(answer) && answer >= 0 && answer < 4, question);
    }
  }
});

test('quiz pass threshold is three correct answers out of five', () => {
  assert.match(html, /quiz:correct>=3/);
  assert.match(html, /correct>=3\?/);
  assert.equal([0,1,2].some(score => score >= 3), false);
  assert.equal([3,4,5].every(score => score >= 3), true);
});

test('fallback crystal drawing and player use the same projection', () => {
  assert.match(html, /const gx=x\*25,gy=z\*9-78/);
  assert.match(html, /roundRect\(px\*25-12,\s*pz\*9-78/);
});

test('fallback portal unlock is tied to the drawn gateway coordinates', () => {
  assert.match(html, /got===5&&Math\.hypot\(px,pz\+3\)<2\.2/);
  assert.match(html, /if\(got===5&&Math\.hypot/);
});

test('progress uses the same storage key for saving and loading', () => {
  assert.match(html, /localStorage\.getItem\('bq-grade7-v2'/);
  assert.match(html, /localStorage\.setItem\('bq-grade7-v2'/);
});

test('both 3D and 2D fallback renderers and restart reset are present', () => {
  assert.match(html, /function setup3D\(\)/);
  assert.match(html, /function setupFallback\(\)/);
  assert.match(html, /resetFallbackPosition\(\);/);
  assert.match(html, /gemHalos\.forEach\(h=>h\.visible=true\)/);
});

test('browser module JavaScript passes the Node syntax parser', () => {
  const moduleTag = '<script type="module">';
  const moduleStart = html.indexOf(moduleTag);
  assert.notEqual(moduleStart, -1, 'module script exists');
  const bodyStart = html.indexOf('>', moduleStart) + 1;
  const bodyEnd = html.indexOf('</script>', bodyStart);
  assert.ok(bodyEnd > bodyStart, 'module script has a closing tag');
  const moduleScript = html.slice(bodyStart, bodyEnd);
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: moduleScript,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
