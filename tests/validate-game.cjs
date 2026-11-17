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

const topics = declaration('topics', 'concepts');
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


test('mobile island canvas captures touch drags without page-scroll cancellation', () => {
  assert.ok(html.includes('canvas{display:block;touch-action:none;'));
  assert.ok(html.includes('@media(max-width:600px)'));
});

test('failed quiz can be retried and starts with a fresh learning attempt', () => {
  assert.ok(html.includes("function openLand(i){islandChallenge=false;current=i;level=0;phase='learn';correct=0;"));
  assert.ok(html.includes('Review the learning levels and try again to earn your star.'));
  assert.ok(html.includes('progress[clearedLand]={practice:true,quiz:correct>=3,score:correct}'));
});

test('crystal challenge requires a correct answer before the claim button activates', () => {
  const checkHandler = html.slice(html.indexOf("$('#check').onclick"), html.indexOf("$('#next').onclick"));
  assert.ok(checkHandler.includes('if(selected===q[2])'));
  assert.ok(checkHandler.includes("$('#check').disabled=true;$('#next').disabled=false"));
  assert.ok(checkHandler.includes("if(!islandChallenge){$('#check').disabled=true;$('#next').disabled=false}"));
});

test('both renderer modes only unlock the portal after five crystals', () => {
  assert.ok(html.includes('got===5&&Math.hypot(player.position.x,player.position.z+7.15)<2.2'));
  assert.ok(html.includes('got===5&&Math.hypot(px,pz+3)<2.2'));
});

test('restart clears crystal state and restores collected visuals', () => {
  const reset = html.slice(html.indexOf('function resetIsland'), html.indexOf("$('#start').onclick"));
  assert.ok(reset.includes('got=0;ready=false;pendingCrystal=null;fallbackCollected.clear()'));
  assert.ok(reset.includes('gemHalos.forEach(h=>h.visible=true)'));
  assert.ok(reset.includes('gems.forEach(g=>g.visible=true)'));
});

test('five crystals reveal a floating waypoint in both renderers', () => {
  assert.ok(html.includes('waypoint.visible=got===5&&!ready'));
  assert.ok(html.includes('waypoint.lookAt(0,1.8,-7.15)'));
  assert.ok(html.includes('Floating waypoint arrow appears only after all five crystals are earned.'));
  assert.ok(html.includes('if(got===5&&!ready)'));
});

test('portal glow intensifies after unlocking and adds animated energy effects', () => {
  assert.ok(html.includes('portalLight.intensity=ready?3.4:0'));
  assert.ok(html.includes('portalRing.material.emissiveIntensity=ready?5.2:3.2'));
  assert.ok(html.includes('portalSparks.children.forEach'));
  assert.ok(html.includes("ctx.shadowBlur=got===5?34:18"));
});

test('3D player movement is constrained by a circular island boundary', () => {
  assert.ok(html.includes('const islandEdge=Math.hypot(player.position.x,player.position.z);if(islandEdge>8.35)'));
  assert.ok(html.includes('player.position.x=player.position.x/islandEdge*8.35'));
  assert.ok(html.includes('player.position.z=player.position.z/islandEdge*8.35'));
  assert.ok(!html.includes('player.position.x=clamp(player.position.x,-8.45,8.45)'));
});

test('2D fallback movement uses the same radial boundary approach', () => {
  assert.ok(html.includes('const islandEdge=Math.hypot(px,pz);if(islandEdge>8.1)'));
  assert.ok(html.includes('px=px/islandEdge*8.1'));
  assert.ok(html.includes('pz=pz/islandEdge*8.1'));
  assert.ok(!html.includes('px=clamp(px+x/l*.12,-8,8)'));
});


test('3D island trees register player collision zones', () => {
  assert.ok(html.includes('const treeColliders=[];'));
  assert.ok(html.includes('treeColliders.push({x,z,radius:.62})'));
});

test('3D player movement checks tree collisions on both movement axes', () => {
  assert.ok(html.includes('treeColliders.some(o=>Math.hypot(nextX-o.x,player.position.z-o.z)<o.radius)'));
  assert.ok(html.includes('treeColliders.some(o=>Math.hypot(player.position.x-o.x,nextZ-o.z)<o.radius)'));
});


test('each of the ten lands provides a Grade 7 concept explanation', () => {
  const concepts = declaration('concepts', 'banks');
  assert.equal(concepts.length, 10);
  assert.ok(concepts.every(note => typeof note === 'string' && note.length > 80));
  assert.ok(html.includes('id="concept"'));
  assert.ok(html.includes("$('#concept').textContent=(phase==='learn'||islandChallenge)?concepts[current]"));
});


test('2D fallback player movement also respects visible tree trunks', () => {
  assert.ok(html.includes('const fallbackTreeColliders=['));
  assert.ok(html.includes('fallbackTreeColliders.some(o=>Math.hypot(nextX-o.x,pz-o.z)<o.radius)'));
  assert.ok(html.includes('fallbackTreeColliders.some(o=>Math.hypot(px-o.x,nextZ-o.z)<o.radius)'));
});

test('clearing a land returns the player to the island with a portal for the next uncleared land', () => {
  assert.match(html, /const nextLand=topics\.findIndex\(\(_,i\)=>!progress\[i\]\?\.quiz\)/);
  assert.match(html, /if\(correct>=3\)\{const nextLand=topics\.findIndex/);
  assert.match(html, /ready=true;\$\('#portal'\)\.disabled=false;\$\('#portal'\)\.textContent='Enter portal: '\+topics\[nextLand\]/);
  assert.match(html, /\$\('#lesson'\)\.classList\.remove\('active'\);islandChallenge=false;active=false/);
  assert.match(html, /A new portal to '\+topics\[nextLand\]\+' has appeared on the island\./);
});

test('the final cleared land ends the portal chain cleanly', () => {
  assert.match(html, /All ten lands cleared — you are the Maths Kingdom champion!/);
  assert.match(html, /\$\('#portal'\)\.textContent='Kingdom completed'/);
});
