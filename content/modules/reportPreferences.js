/** Preferências locais dos relatórios, separadas por login e servidor consultado. */
window.JEPessoasReportPreferences = (function () {
  'use strict';
  const PREFIX = 'je_xt_report_preferences_v1_';
  const SORT_KEYS = ['label', 'regime', 'pecuniaMin', 'homologMin', 'p1', 'p2', 'p3', 'p4', 'p5', 'totalLost', 'alertCount'];
  const id = (v) => /^\d{4,}$/.test(String(v || '')) ? String(v) : '';
  function owner() {
    const el = document.querySelector('#divTopServidorMatricula, .matricula strong, .matricula span, .matricula');
    return id(el && (el.innerText || '').replace(/\D/g, '')) || 'self';
  }
  function key(report, subject) {
    if (!['recognition', 'payroll', 'lostHours'].includes(report)) throw new Error('Relatório desconhecido');
    return PREFIX + owner() + '_' + report + (id(subject) ? '_' + id(subject) : '');
  }
  function normalize(report, value) {
    const v = value && typeof value === 'object' ? value : {};
    const out = {};
    if (report !== 'lostHours') {
      ['from', 'to'].forEach((k) => { if (/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(v[k])) out[k] = v[k]; });
    }
    if (report === 'recognition') {
      if (['server', 'month'].includes(v.groupBy)) out.groupBy = v.groupBy;
      if (Array.isArray(v.selectedMatriculas)) out.selectedMatriculas = [...new Set(v.selectedMatriculas.map(id).filter(Boolean))];
      if (/^\d*$/.test(v.unitId)) out.unitId = v.unitId;
    }
    if (report === 'payroll' && typeof v.onlyIssues === 'boolean') out.onlyIssues = v.onlyIssues;
    if (report === 'lostHours') {
      if (SORT_KEYS.includes(v.sortKey)) out.sortKey = v.sortKey;
      if (['asc', 'desc'].includes(v.sortDir)) out.sortDir = v.sortDir;
    }
    return out;
  }
  async function load(report, defaults, subject) {
    const storageKey = key(report, subject);
    const stored = await new Promise((resolve) => {
      try {
        chrome.storage.local.get({ [storageKey]: null }, (items) => resolve(items && items[storageKey]));
      } catch (_) { resolve(null); }
    });
    return Object.assign(normalize(report, defaults), normalize(report, stored));
  }
  function save(report, value, subject) {
    const storageKey = key(report, subject);
    return new Promise((resolve) => {
      try { chrome.storage.local.set({ [storageKey]: normalize(report, value) }, resolve); }
      catch (_) { resolve(); }
    });
  }
  return { load, save };
})();
