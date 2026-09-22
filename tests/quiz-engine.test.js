const assert = require('assert');
const engine = require('../assets/quiz-engine.js');
const loader = require('../assets/question-loader.js');
const bank = require('../assets/question-bank.js');

const validation = loader.validateBank();
assert.strictEqual(validation.valid, true, validation.errors.join('\n'));
assert.strictEqual(bank.length, 90, 'Question bank should have five questions per unit.');
for (let unit = 1; unit <= 18; unit += 1) assert.strictEqual(loader.forLesson(unit).length, 5);
assert.strictEqual(loader.forExam({ perUnit: 1 }).length, 18);

const questions = loader.forLesson(1);
const attempt = engine.createAttempt({ mode: 'lesson', unit: 1 }, questions);
assert.strictEqual(attempt.questionIds.length, 5);
assert.strictEqual(engine.isComplete(attempt), false);
questions.forEach(function (question, index) {
  engine.answerQuestion(attempt, question.id, index === 0 ? question.answer : 'not-correct');
});
assert.strictEqual(engine.isComplete(attempt), true);
const result = engine.submitAttempt(attempt, questions, '2026-01-01T00:00:00.000Z');
assert.strictEqual(result.correct, 1);
assert.strictEqual(result.total, 5);
assert.strictEqual(result.percentage, 20);
assert.strictEqual(result.passed, false);
assert.throws(function () { engine.answerQuestion(attempt, questions[0].id, 'a'); });
engine.moveTo(attempt, 999);
assert.strictEqual(attempt.currentIndex, 4);
engine.moveTo(attempt, -5);
assert.strictEqual(attempt.currentIndex, 0);

console.log('quiz-engine.test.js: all assertions passed');
