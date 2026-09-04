import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

function mkEl() {
  const attrs = {};
  return { attrs, setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: (k) => (k in attrs ? attrs[k] : null) };
}

function mkChrome(seed = {}) {
  const store = { ...seed };
  const listeners = [];
  return {
    _emit: (changes) => listeners.forEach((l) => l(changes, 'local')),
    storage: {
      local: {
        get: (defaults, cb) => {
          const out = {};
          Object.keys(defaults || {}).forEach((k) => { out[k] = (k in store) ? store[k] : defaults[k]; });
          cb(out);
        },
        set: (obj, cb) => {
          const changes = {};
          Object.keys(obj).forEach((k) => { changes[k] = { oldValue: store[k], newValue: obj[k] }; store[k] = obj[k]; });
          if (cb) cb();
          listeners.forEach((l) => l(changes, 'local'));
        }
      },
      onChanged: { addListener: (fn) => listeners.push(fn) }
    },
    _store: store
  };
}

function load(seed) {
  const html = mkEl();
  const body = mkEl();
  const chrome = mkChrome(seed);
  const S = loadModule('settings.js', {
    chrome,
    document: { documentElement: html, body }
  }).JEPessoasSettings;
  return { S, html, body, chrome };
}

test('defaults() e DEFS', () => {
  const { S } = load();
  assert.deepEqual(S.defaults(), { kpiCardStyle: 'flat', kpiCardEmphasis: 'soft' });
  assert.equal(S.DEFS.kpiCardStyle.attr, 'data-je-kpi-style');
  assert.equal(S.DEFS.kpiCardEmphasis.attr, 'data-je-kpi-emphasis');
});

test('normalize — válido passa, inválido cai no padrão, chave desconhecida devolve cru', () => {
  const { S } = load();
  assert.equal(S.normalize('kpiCardStyle', 'gradient'), 'gradient');
  assert.equal(S.normalize('kpiCardStyle', 'neon'), 'flat');
  assert.equal(S.normalize('kpiCardEmphasis', null), 'soft');
  assert.equal(S.normalize('xpto', 'abc'), 'abc');
});

test('load — storage vazio aplica os padrões no documento', () => {
  const { S, body, html } = load();
  S.load((norm) => {
    assert.deepEqual(norm, { kpiCardStyle: 'flat', kpiCardEmphasis: 'soft' });
  });
  assert.equal(body.getAttribute('data-je-kpi-style'), 'flat');
  assert.equal(body.getAttribute('data-je-kpi-emphasis'), 'soft');
  assert.equal(html.getAttribute('data-je-kpi-style'), 'flat');
});

test('load — lê valores salvos e normaliza os inválidos', () => {
  const { S, body } = load({ kpiCardStyle: 'gradient', kpiCardEmphasis: 'zzz' });
  S.load();
  assert.equal(body.getAttribute('data-je-kpi-style'), 'gradient');
  assert.equal(body.getAttribute('data-je-kpi-emphasis'), 'soft');
});

test('set — grava no storage, normaliza e reflete no documento', () => {
  const { S, body, chrome } = load();
  let done = false;
  S.set('kpiCardEmphasis', 'glow', () => { done = true; });
  assert.equal(done, true);
  assert.equal(chrome._store.kpiCardEmphasis, 'glow');
  assert.equal(body.getAttribute('data-je-kpi-emphasis'), 'glow');

  S.set('kpiCardStyle', 'neon');
  assert.equal(chrome._store.kpiCardStyle, 'flat');
  assert.equal(body.getAttribute('data-je-kpi-style'), 'flat');
});

test('set — chave fora do schema é no-op mas chama o callback', () => {
  const { S, chrome } = load();
  let done = false;
  S.set('qualquer', 'x', () => { done = true; });
  assert.equal(done, true);
  assert.equal('qualquer' in chrome._store, false);
});

test('applyFrom — patch parcial só mexe na chave presente', () => {
  const { S, body } = load();
  body.setAttribute('data-je-kpi-style', 'gradient');
  body.setAttribute('data-je-kpi-emphasis', 'glow');
  S.applyFrom({ kpiCardStyle: 'flat' });
  assert.equal(body.getAttribute('data-je-kpi-style'), 'flat');
  assert.equal(body.getAttribute('data-je-kpi-emphasis'), 'glow'); // intocado
});

test('onChanged — mudança feita pelo popup sincroniza a página aberta', () => {
  const { S, body, chrome } = load();
  S.load();
  assert.equal(body.getAttribute('data-je-kpi-style'), 'flat');
  chrome._emit({ kpiCardStyle: { oldValue: 'flat', newValue: 'gradient' } });
  assert.equal(body.getAttribute('data-je-kpi-style'), 'gradient');
  assert.equal(body.getAttribute('data-je-kpi-emphasis'), 'soft'); // não foi mexido
});
