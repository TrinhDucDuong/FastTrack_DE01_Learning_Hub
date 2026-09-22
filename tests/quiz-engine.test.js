const assert = require('assert');
const engine = require('../assets/quiz-engine.js');
const loader = require('../assets/question-loader.js');
const bank = require('../assets/question-bank.js');

const validation = loader.validateBank();
assert.strictEqual(validation.valid, true, validation.errors.join('\n'));
assert.strictEqual(bank.length, 360, 'Question bank should have twenty questions per unit.');
for (let unit = 1; unit <= 18; unit += 1) assert.strictEqual(loader.forLesson(unit).length, 20);
function seeded(seed) {
  let value = seed;
  return function () { value = (value * 1664525 + 1013904223) % 4294967296; return value / 4294967296; };
}
const examA = loader.forExam({ count: 40, random: seeded(42) });
const examB = loader.forExam({ count: 40, random: seeded(42) });
assert.strictEqual(examA.length, 40);
assert.deepStrictEqual(examA.map(function (question) { return question.id; }), examB.map(function (question) { return question.id; }));
assert.strictEqual(new Set(examA.map(function (question) { return question.id; })).size, 40);
assert.strictEqual(new Set(examA.map(function (question) { return question.unit; })).size, 18, 'A full-course exam should cover every unit.');
const examCoverage = examA.reduce(function (counts, question) {
  counts[question.unit] = (counts[question.unit] || 0) + 1; return counts;
}, {});
assert.ok(Math.max.apply(null, Object.values(examCoverage)) - Math.min.apply(null, Object.values(examCoverage)) <= 1, 'Exam sampling should be balanced across units.');
assert.strictEqual(loader.forExam({ count: 999 }).length, bank.length);

const questions = loader.forLesson(1);
const attempt = engine.createAttempt({ mode: 'lesson', unit: 1 }, questions);
assert.strictEqual(attempt.questionIds.length, 20);
assert.strictEqual(engine.isComplete(attempt), false);
questions.forEach(function (question, index) {
  engine.answerQuestion(attempt, question.id, index === 0 ? question.answer : 'not-correct');
});
assert.strictEqual(engine.isComplete(attempt), true);
const result = engine.submitAttempt(attempt, questions, '2026-01-01T00:00:00.000Z');
assert.strictEqual(result.correct, 1);
assert.strictEqual(result.total, 20);
assert.strictEqual(result.percentage, 5);
assert.strictEqual(result.passed, false);
assert.throws(function () { engine.answerQuestion(attempt, questions[0].id, 'a'); });
engine.moveTo(attempt, 999);
assert.strictEqual(attempt.currentIndex, 19);
engine.moveTo(attempt, -5);
assert.strictEqual(attempt.currentIndex, 0);

console.log('quiz-engine.test.js: all assertions passed');
