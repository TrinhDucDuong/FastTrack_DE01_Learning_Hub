(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DE01QuizEngine = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createAttempt(config, questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Quiz requires at least one question.');
    }
    return {
      version: 1,
      id: 'attempt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      mode: config.mode,
      unit: config.unit || null,
      sourceAttemptId: config.sourceAttemptId || null,
      questionIds: questions.map(function (question) { return question.id; }),
      currentIndex: 0,
      answers: {},
      startedAt: new Date().toISOString(),
      submittedAt: null
    };
  }

  function answerQuestion(attempt, questionId, choiceId) {
    if (attempt.submittedAt) throw new Error('Cannot change a submitted attempt.');
    if (!attempt.questionIds.includes(questionId)) throw new Error('Question is not in this attempt.');
    attempt.answers[questionId] = choiceId;
    return attempt;
  }

  function moveTo(attempt, index) {
    const next = Math.max(0, Math.min(index, attempt.questionIds.length - 1));
    attempt.currentIndex = next;
    return attempt;
  }

  function isComplete(attempt) {
    return attempt.questionIds.every(function (id) { return Boolean(attempt.answers[id]); });
  }

  function unansweredIds(attempt) {
    return attempt.questionIds.filter(function (id) { return !attempt.answers[id]; });
  }

  function scoreAttempt(attempt, questions) {
    const byId = new Map(questions.map(function (question) { return [question.id, question]; }));
    const items = attempt.questionIds.map(function (id) {
      const question = byId.get(id);
      if (!question) throw new Error('Missing question: ' + id);
      const selected = attempt.answers[id] || null;
      return {
        questionId: id,
        unit: question.unit,
        topic: question.topic,
        selected: selected,
        correctChoice: question.answer,
        correct: selected === question.answer
      };
    });
    const correct = items.filter(function (item) { return item.correct; }).length;
    const total = items.length;
    const percentage = total ? Math.round((correct / total) * 100) : 0;
    return { correct: correct, total: total, percentage: percentage, passed: percentage >= 70, items: items };
  }

  function submitAttempt(attempt, questions, now) {
    if (!isComplete(attempt)) throw new Error('Answer every question before submitting.');
    attempt.submittedAt = now || new Date().toISOString();
    return scoreAttempt(attempt, questions);
  }

  return {
    createAttempt: createAttempt,
    answerQuestion: answerQuestion,
    moveTo: moveTo,
    isComplete: isComplete,
    unansweredIds: unansweredIds,
    scoreAttempt: scoreAttempt,
    submitAttempt: submitAttempt
  };
}));
