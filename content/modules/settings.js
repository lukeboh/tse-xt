/**
 * TSE XT — Preferências de aparência do painel de KPIs
 *
 * As opções são configuradas na janela da extensão (popup) e ficam em
 * chrome.storage.local (compartilhado entre popup e content script):
 *
 *   kpiCardStyle    : 'flat' (padrão) | 'gradient'
 *   kpiCardEmphasis : 'soft' (padrão) | 'glow'
 *
 * applyFrom() reflete os valores em atributos no <html> e no <body>; todo o
 * resto é CSS (body.je-xt-enabled[data-je-kpi-style="gradient"] .je-kpi-card …),
 * então os cards não precisam ser re-renderizados. Um listener de
 * chrome.storage.onChanged mantém a página em sincronia se o popup mudar a
 * preferência com a aba aberta.
 */

window.JEPessoasSettings = (function () {
  'use strict';

  const DEFS = {
    'kpiCardStyle': {
      attr: 'data-je-kpi-style',
      values: ['flat', 'gradient'],
      def: 'flat'
    },
    'kpiCardEmphasis': {
      attr: 'data-je-kpi-emphasis',
      values: ['soft', 'glow'],
      def: 'soft'
    }
  };

  function defaults() {
    const out = {};
    for (const k in DEFS) out[k] = DEFS[k].def;
    return out;
  }

  function normalize(key, raw) {
    const d = DEFS[key];
    if (!d) return raw;
    return d.values.indexOf(raw) >= 0 ? raw : d.def;
  }

  // Aplica só as chaves presentes em `obj` (aceita patch parcial, ex.: um
  // único valor vindo do chrome.storage.onChanged).
  function applyFrom(obj) {
    obj = obj || {};
    const targets = [];
    if (typeof document !== 'undefined') {
      if (document.documentElement) targets.push(document.documentElement);
      if (document.body) targets.push(document.body);
    }
    for (const k in DEFS) {
      if (!(k in obj)) continue;
      const v = normalize(k, obj[k]);
      targets.forEach((t) => {
        if (t && typeof t.setAttribute === 'function') t.setAttribute(DEFS[k].attr, v);
      });
    }
  }

  function load(cb) {
    cb = cb || function () {};
    try {
      chrome.storage.local.get(defaults(), (items) => {
        const norm = {};
        for (const k in DEFS) norm[k] = normalize(k, items && items[k]);
        applyFrom(norm);
        cb(norm);
      });
    } catch (e) {
      const d = defaults();
      applyFrom(d);
      cb(d);
    }
  }

  function set(key, val, cb) {
    cb = cb || function () {};
    if (!DEFS[key]) return cb();
    const v = normalize(key, val);
    try {
      chrome.storage.local.set({ [key]: v }, () => { applyFrom({ [key]: v }); cb(); });
    } catch (e) {
      cb();
    }
  }

  // Sincroniza a página aberta quando o popup altera a preferência.
  try {
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        const patch = {};
        let touched = false;
        for (const k in DEFS) {
          if (changes[k]) { patch[k] = changes[k].newValue; touched = true; }
        }
        if (touched) applyFrom(patch);
      });
    }
  } catch (e) {}

  return { DEFS, defaults, normalize, applyFrom, load, set };
})();
