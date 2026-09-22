const assert = require('assert');
const storage = require('../assets/quiz-storage.js');

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const memory = new MemoryStorage();
assert.deepStrictEqual(storage.load(memory), storage.emptyState());

const attempt = {
  id: 'attempt-1', mode: 'lesson', unit: 3, sourceAttemptId: null,
  questionIds: ['u03-q001', 'u03-q002'], currentIndex: 1,
  answers: { 'u03-q001': 'a' }, startedAt: '2026-01-01T00:00:00.000Z', submittedAt: null
};
storage.saveActive(attempt, memory);
attempt.currentIndex = 0;
assert.strictEqual(storage.getActive(memory).currentIndex, 1, 'Stored attempt must be cloned.');

const firstResult = {
  correct: 1, total: 2, percentage: 50, passed: false,
  items: [
    { questionId: 'u03-q001', unit: 3, topic: 'partitioning', selected: 'a', correctChoice: 'a', correct: true },
    { questionId: 'u03-q002', unit: 3, topic: 'indexing', selected: 'b', correctChoice: 'a', correct: false }
  ]
};
const submittedAttempt = Object.assign({}, attempt, { currentIndex: 1, submittedAt: '2026-01-01T00:05:00.000Z' });
storage.recordResult(submittedAttempt, firstResult, memory);
assert.strictEqual(storage.getActive(memory), null);
assert.strictEqual(storage.getHistory(memory).length, 1);
assert.strictEqual(storage.findHistory('attempt-1', memory).percentage, 50);

const secondAttempt = Object.assign({}, submittedAttempt, { id: 'attempt-2' });
const secondResult = {
  correct: 0, total: 1, percentage: 0, passed: false,
  items: [{ questionId: 'u03-q002', unit: 3, topic: 'indexing', selected: 'c', correctChoice: 'a', correct: false }]
};
storage.recordResult(secondAttempt, secondResult, memory);
const stats = storage.statistics(memory);
assert.strictEqual(stats.attempts, 2);
assert.strictEqual(stats.answerAccuracy, 33);
assert.strictEqual(stats.units['3'].attempted, 3);
assert.strictEqual(stats.weakTopics[0].key, 'indexing');
assert.strictEqual(stats.weakTopics[0].accuracy, 0);

memory.setItem(storage.key, '{not-json');
assert.deepStrictEqual(storage.load(memory), storage.emptyState(), 'Corrupt data should fail safely.');

console.log('quiz-storage.test.js: all assertions passed');
