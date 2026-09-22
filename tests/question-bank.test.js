const assert = require('assert');
const fs = require('fs');
const path = require('path');
const bank = require('../assets/question-bank.js');
const loader = require('../assets/question-loader.js');

const validation = loader.validateBank();
assert.strictEqual(validation.valid, true, validation.errors.join('\n'));

const ids = new Set();
const coverage = new Map();
const brokenReferences = [];
for (const question of bank) {
  assert.strictEqual(ids.has(question.id), false, 'Duplicate question id: ' + question.id);
  ids.add(question.id);
  coverage.set(question.unit, (coverage.get(question.unit) || 0) + 1);
  const parts = question.lessonUrl.split('#');
  const lessonPath = path.join(__dirname, '..', parts[0]);
  if (!fs.existsSync(lessonPath)) {
    brokenReferences.push('Missing lesson: ' + question.lessonUrl);
    continue;
  }
  if (parts[1]) {
    const html = fs.readFileSync(lessonPath, 'utf8');
    if (!html.includes('id="' + parts[1] + '"')) brokenReferences.push('Missing anchor: ' + question.lessonUrl);
  }
}
assert.deepStrictEqual(brokenReferences, [], brokenReferences.join('\n'));

for (let unit = 1; unit <= 18; unit += 1) {
  assert.strictEqual(coverage.get(unit), 5, 'Question coverage mismatch for unit ' + unit);
  const difficulties = new Set(loader.forLesson(unit).map(function (question) { return question.difficulty; }));
  assert.deepStrictEqual(Array.from(difficulties).sort(), ['applied', 'basic', 'intermediate'], 'Difficulty coverage mismatch for unit ' + unit);
}

console.log('question-bank.test.js: all assertions passed');
