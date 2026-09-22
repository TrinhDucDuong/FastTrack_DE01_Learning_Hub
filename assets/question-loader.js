(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./question-bank.js') : root.DE01_QUESTION_BANK
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DE01QuestionLoader = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (bank) {
  'use strict';

  const validDifficulties = new Set(['basic', 'intermediate', 'applied']);

  function validateQuestion(question) {
    const errors = [];
    if (!question || typeof question !== 'object') return ['Question must be an object.'];
    if (!/^[a-z0-9-]+$/.test(question.id || '')) errors.push('Invalid id.');
    if (!Number.isInteger(question.unit) || question.unit < 1 || question.unit > 18) errors.push('Invalid unit.');
    if (!question.topic) errors.push('Missing topic.');
    if (!validDifficulties.has(question.difficulty)) errors.push('Invalid difficulty.');
    if (!question.prompt) errors.push('Missing prompt.');
    if (!Array.isArray(question.choices) || question.choices.length < 2) errors.push('At least two choices are required.');
    const choiceIds = new Set((question.choices || []).map(function (choice) { return choice.id; }));
    if (choiceIds.size !== (question.choices || []).length) errors.push('Choice ids must be unique.');
    if (!choiceIds.has(question.answer)) errors.push('Answer must match one choice.');
    if (!question.explanation) errors.push('Missing explanation.');
    if (!question.lessonUrl) errors.push('Missing lesson URL.');
    return errors;
  }

  function validateBank() {
    if (!Array.isArray(bank)) return { valid: false, errors: ['Question bank must be an array.'] };
    const errors = [];
    const ids = new Set();
    bank.forEach(function (question, index) {
      if (ids.has(question.id)) errors.push('Duplicate id: ' + question.id);
      ids.add(question.id);
      validateQuestion(question).forEach(function (error) {
        errors.push('Question ' + (question.id || index) + ': ' + error);
      });
    });
    return { valid: errors.length === 0, errors: errors };
  }

  function copyQuestions(questions) {
    return questions.map(function (question) {
      return Object.assign({}, question, { choices: question.choices.map(function (choice) { return Object.assign({}, choice); }) });
    });
  }

  function forLesson(unit) {
    return copyQuestions(bank.filter(function (question) { return question.unit === Number(unit); }));
  }

  function forExam(options) {
    const perUnit = Math.max(1, Number((options || {}).perUnit) || 1);
    const selected = [];
    for (let unit = 1; unit <= 18; unit += 1) {
      selected.push.apply(selected, bank.filter(function (question) { return question.unit === unit; }).slice(0, perUnit));
    }
    return copyQuestions(selected);
  }

  function byIds(ids) {
    const byId = new Map(bank.map(function (question) { return [question.id, question]; }));
    return copyQuestions(ids.map(function (id) { return byId.get(id); }).filter(Boolean));
  }

  return { validateQuestion: validateQuestion, validateBank: validateBank, forLesson: forLesson, forExam: forExam, byIds: byIds };
}));
