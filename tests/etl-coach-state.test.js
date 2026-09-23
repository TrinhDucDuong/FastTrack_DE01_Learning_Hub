const assert = require('assert');
const stateApi = require('../assets/etl-coach-state.js');

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const memory = new MemoryStorage();
let state = stateApi.load(memory);
assert.deepStrictEqual(state, stateApi.emptyState());

state.profile.source = 'api';
state = stateApi.toggle(state, 'completedStages', 'contract');
state = stateApi.toggle(state, 'completedDrills', 'duplicate');
state.rubric.correctness = 21;
state = stateApi.save(state, memory);

const loaded = stateApi.load(memory);
assert.strictEqual(loaded.profile.source, 'api');
assert.deepStrictEqual(loaded.completedStages, ['contract']);
assert.deepStrictEqual(loaded.completedDrills, ['duplicate']);
assert.strictEqual(stateApi.completion(loaded, 14, 6).stagePercent, 7);
assert.strictEqual(stateApi.rubricTotal(loaded, { correctness: 25 }), 21);

state = stateApi.toggle(loaded, 'completedStages', 'contract');
assert.deepStrictEqual(state.completedStages, []);

memory.setItem(stateApi.key, '{not-json');
assert.deepStrictEqual(stateApi.load(memory), stateApi.emptyState(), 'Corrupt data should fail safely.');

const unsafe = stateApi.sanitize({ completedStages: ['one', 'one', 3], rubric: { correctness: -2, delivery: 4 } });
assert.deepStrictEqual(unsafe.completedStages, ['one']);
assert.deepStrictEqual(unsafe.rubric, { delivery: 4 });

console.log('etl-coach-state.test.js: all assertions passed');
