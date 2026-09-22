(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DE01QuizStorage = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const KEY = 'de01-quiz-state-v1';

  function emptyState() { return { version: 1, activeAttempt: null, history: [] }; }
  function adapter(store) {
    const candidate = store || root.localStorage;
    if (!candidate) throw new Error('Storage is not available.');
    return candidate;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function load(store) {
    const target = adapter(store);
    try {
      const parsed = JSON.parse(target.getItem(KEY) || 'null');
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.history)) return emptyState();
      return parsed;
    } catch (error) {
      return emptyState();
    }
  }

  function save(state, store) {
    adapter(store).setItem(KEY, JSON.stringify(state));
    return state;
  }

  function saveActive(attempt, store) {
    const state = load(store);
    state.activeAttempt = clone(attempt);
    save(state, store);
    return state.activeAttempt;
  }

  function getActive(store) { return load(store).activeAttempt; }

  function clearActive(attemptId, store) {
    const state = load(store);
    if (!attemptId || (state.activeAttempt && state.activeAttempt.id === attemptId)) state.activeAttempt = null;
    save(state, store);
  }

  function recordResult(attempt, result, store) {
    const state = load(store);
    const record = {
      id: attempt.id,
      mode: attempt.mode,
      unit: attempt.unit,
      sourceAttemptId: attempt.sourceAttemptId || null,
      questionIds: attempt.questionIds.slice(),
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      correct: result.correct,
      total: result.total,
      percentage: result.percentage,
      passed: result.passed,
      items: clone(result.items)
    };
    state.history = state.history.filter(function (item) { return item.id !== record.id; });
    state.history.unshift(record);
    state.history = state.history.slice(0, 100);
    if (state.activeAttempt && state.activeAttempt.id === attempt.id) state.activeAttempt = null;
    save(state, store);
    return record;
  }

  function getHistory(store) { return load(store).history; }
  function findHistory(id, store) {
    return getHistory(store).find(function (item) { return item.id === id; }) || null;
  }

  function statistics(store) {
    const history = getHistory(store);
    const units = {}, topics = {};
    let answers = 0, correctAnswers = 0, totalPercentage = 0, passedAttempts = 0;
    function add(bucket, key, correct) {
      if (!bucket[key]) bucket[key] = { key: key, attempted: 0, correct: 0, accuracy: 0 };
      bucket[key].attempted += 1;
      if (correct) bucket[key].correct += 1;
      bucket[key].accuracy = Math.round((bucket[key].correct / bucket[key].attempted) * 100);
    }
    history.forEach(function (attempt) {
      totalPercentage += attempt.percentage;
      if (attempt.passed) passedAttempts += 1;
      attempt.items.forEach(function (item) {
        answers += 1; if (item.correct) correctAnswers += 1;
        add(units, String(item.unit), item.correct);
        add(topics, item.topic, item.correct);
      });
    });
    const weakTopics = Object.values(topics)
      .filter(function (item) { return item.attempted >= 2 && item.accuracy < 70; })
      .sort(function (a, b) { return a.accuracy - b.accuracy || b.attempted - a.attempted; });
    return {
      attempts: history.length,
      passedAttempts: passedAttempts,
      averageScore: history.length ? Math.round(totalPercentage / history.length) : 0,
      answerAccuracy: answers ? Math.round((correctAnswers / answers) * 100) : 0,
      units: units,
      topics: topics,
      weakTopics: weakTopics
    };
  }

  return {
    key: KEY, emptyState: emptyState, load: load, save: save,
    saveActive: saveActive, getActive: getActive, clearActive: clearActive,
    recordResult: recordResult, getHistory: getHistory, findHistory: findHistory,
    statistics: statistics
  };
}));
