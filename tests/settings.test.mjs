import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers.mjs';

function mkLS(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    _m: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

function mkDoc() {
  const attrs = {};
  const el = { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] };
  return { doc: { documentElement: el, body: el }, attrs };
}

function load(seed) {
  const { doc } = mkDoc();
  return loadModule('settings.js', { localStorage: mkLS(seed), document: doc }).JEPessoasSettings;
}

test('padrões quando nada foi salvo', () => {
  const S = load();
  assert.equal(S.get('je_xt_kpi_style'), 'flat');
  assert.equal(S.get('je_xt_kpi_emphasis'), 'soft');
  assert.deepEqual(S.getAll(), { je_xt_kpi_style: 'flat', je_xt_kpi_emphasis: 'soft' });
});

test('lê valor salvo válido', () => {
  const S = load({ je_xt_kpi_style: 'gradient', je_xt_kpi_emphasis: 'glow' });
  assert.equal(S.get('je_xt_kpi_style'), 'gradient');
  assert.equal(S.get('je_xt_kpi_emphasis'), 'glow');
});

test('valor inválido cai no padrão', () => {
  const S = load({ je_xt_kpi_style: 'neon', je_xt_kpi_emphasis: '' });
  assert.equal(S.get('je_xt_kpi_style'), 'flat');
  assert.equal(S.get('je_xt_kpi_emphasis'), 'soft');
});

test('set persiste e normaliza', () => {
  const S = load();
  S.set('je_xt_kpi_style', 'gradient');
  assert.equal(S.get('je_xt_kpi_style'), 'gradient');
  S.set('je_xt_kpi_style', 'xxx');           // inválido → padrão
  assert.equal(S.get('je_xt_kpi_style'), 'flat');
  S.set('chave_desconhecida', 'x');          // chave fora do schema é ignorada (não grava)
  assert.equal(S.get('chave_desconhecida'), null);
});

test('apply reflete atributos no documento', () => {
  const { doc, attrs } = mkDoc();
  const S = loadModule('settings.js', {
    localStorage: mkLS({ je_xt_kpi_style: 'gradient' }),
    document: doc
  }).JEPessoasSettings;
  S.apply();
  assert.equal(attrs['data-je-kpi-style'], 'gradient');
  assert.equal(attrs['data-je-kpi-emphasis'], 'soft');
});

test('normalize é pura e defensiva', () => {
  const S = load();
  assert.equal(S.normalize('je_xt_kpi_emphasis', 'glow'), 'glow');
  assert.equal(S.normalize('je_xt_kpi_emphasis', null), 'soft');
  assert.equal(S.normalize('inexistente', 'abc'), 'abc');
});
