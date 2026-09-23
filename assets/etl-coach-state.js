(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DE01ETLState = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const key = 'de01-etl-coach-v1';
  const defaults = Object.freeze({
    version: 1,
    profile: Object.freeze({ source: 'database', target: 'warehouse', mode: 'incremental', scale: 'small' }),
    completedStages: Object.freeze([]),
    completedDrills: Object.freeze([]),
    rubric: Object.freeze({})
  });

  function emptyState() {
    return {
      version: defaults.version,
      profile: Object.assign({}, defaults.profile),
      completedStages: [],
      completedDrills: [],
      rubric: {},
      updatedAt: null
    };
  }

  function uniqueStrings(value) {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.filter(function (item) { return typeof item === 'string'; })));
  }

  function sanitize(value) {
    const clean = emptyState();
    if (!value || typeof value !== 'object') return clean;
    if (value.profile && typeof value.profile === 'object') {
      Object.keys(clean.profile).forEach(function (field) {
        if (typeof value.profile[field] === 'string') clean.profile[field] = value.profile[field];
      });
    }
    clean.completedStages = uniqueStrings(value.completedStages);
    clean.completedDrills = uniqueStrings(value.completedDrills);
    if (value.rubric && typeof value.rubric === 'object') {
      Object.keys(value.rubric).forEach(function (field) {
        const score = Number(value.rubric[field]);
        if (Number.isFinite(score) && score >= 0) clean.rubric[field] = score;
      });
    }
    clean.updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
    return clean;
  }

  function load(storage) {
    try {
      const raw = storage.getItem(key);
      return raw ? sanitize(JSON.parse(raw)) : emptyState();
    } catch (error) {
      return emptyState();
    }
  }

  function save(state, storage) {
    const clean = sanitize(state);
    clean.updatedAt = new Date().toISOString();
    storage.setItem(key, JSON.stringify(clean));
    return clean;
  }

  function toggle(state, collection, id) {
    const clean = sanitize(state);
    if (!['completedStages', 'completedDrills'].includes(collection) || typeof id !== 'string') return clean;
    const values = new Set(clean[collection]);
    if (values.has(id)) values.delete(id); else values.add(id);
    clean[collection] = Array.from(values);
    return clean;
  }

  function completion(state, totalStages, totalDrills) {
    const clean = sanitize(state);
    const stages = Math.min(clean.completedStages.length, totalStages);
    const drills = Math.min(clean.completedDrills.length, totalDrills);
    return {
      stages: stages,
      drills: drills,
      stagePercent: totalStages ? Math.round((stages / totalStages) * 100) : 0,
      drillPercent: totalDrills ? Math.round((drills / totalDrills) * 100) : 0
    };
  }

  function rubricTotal(state, maxima) {
    const clean = sanitize(state);
    return Object.keys(maxima).reduce(function (total, field) {
      return total + Math.min(Number(clean.rubric[field]) || 0, maxima[field]);
    }, 0);
  }

  return {
    key: key,
    emptyState: emptyState,
    sanitize: sanitize,
    load: load,
    save: save,
    toggle: toggle,
    completion: completion,
    rubricTotal: rubricTotal
  };
}));
